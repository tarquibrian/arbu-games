-- Validación de canje por el comercio (13.3: "QR de un solo uso, validado contra el
-- servidor; ambas partes reciben confirmación instantánea").
--
-- Cambio de semántica: el canje ya NO marca 'used'. El consumo real ocurre cuando el
-- COMERCIO valida el código. Flujo único para ambas ubicaciones (app / on_site):
--   redeem_coupon()      → 'claimed'  (descuenta monedas, emite código)
--   validate_redemption()→ 'used'     (el comercio confirma la entrega)

-- ============================================================
-- merchant_members — vincula cuentas auth con un comercio (staff múltiple)
-- ============================================================
create table merchant_members (
  merchant_id uuid not null references merchants(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (merchant_id, user_id)
);

alter table merchant_members enable row level security;

-- El miembro solo ve su propia membresía.
create policy read_own_membership on merchant_members
  for select to authenticated using (user_id = auth.uid());

grant select on merchant_members to authenticated;
grant all    on merchant_members to service_role;   -- el admin da de alta miembros

-- ¿El usuario actual pertenece a este comercio?
create or replace function is_merchant_member(p_merchant_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from merchant_members
    where merchant_id = p_merchant_id and user_id = auth.uid()
  );
$$;

-- ============================================================
-- redeem_coupon — reemplaza la versión de 0001: on_site ya NO auto-marca 'used'.
-- ============================================================
create or replace function redeem_coupon(p_coupon_id uuid)
returns coupon_redemptions
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_uid        uuid := auth.uid();
  v_coupon     coupons%rowtype;
  v_balance    integer;
  v_expires    timestamptz;
  v_redemption coupon_redemptions%rowtype;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  select * into v_coupon from coupons where id = p_coupon_id for update;
  if not found or not v_coupon.active then
    raise exception 'Cupón no disponible';
  end if;

  -- Ventana de reclamo (reloj 1).
  if (v_coupon.claim_window_start is not null and now() < v_coupon.claim_window_start)
     or (v_coupon.claim_window_end is not null and now() > v_coupon.claim_window_end) then
    raise exception 'Cupón fuera de la ventana de reclamo';
  end if;

  if v_coupon.quota_remaining is not null and v_coupon.quota_remaining <= 0 then
    raise exception 'Cupón agotado';
  end if;

  select coins into v_balance from profiles where id = v_uid for update;
  if v_balance < v_coupon.price_coins then
    raise exception 'Saldo insuficiente';
  end if;

  update profiles set coins = coins - v_coupon.price_coins where id = v_uid;

  if v_coupon.quota_remaining is not null then
    update coupons set quota_remaining = quota_remaining - 1 where id = p_coupon_id;
  end if;

  -- Ventana de uso (reloj 2).
  if v_coupon.use_window_days is not null then
    v_expires := now() + make_interval(days => v_coupon.use_window_days);
  end if;

  -- Siempre 'claimed': el comercio lo pasa a 'used' al validar.
  insert into coupon_redemptions (coupon_id, user_id, status, claimed_at, used_at, use_expires_at, redemption_code, coins_spent)
    values (
      p_coupon_id, v_uid, 'claimed', now(), null, v_expires,
      'ARBU-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 8)),
      v_coupon.price_coins
    )
    returning * into v_redemption;

  insert into wallet_transactions (user_id, amount, type, description, coupon_redemption_id)
    values (v_uid, -v_coupon.price_coins, 'redeem', 'Canje: ' || v_coupon.title, v_redemption.id);

  return v_redemption;
end;
$$;

-- ============================================================
-- validate_redemption — el comercio consume el código (un solo uso).
-- Verifica: código existe, es de UN CUPÓN DE SU COMERCIO, no usado, no vencido.
-- ============================================================
create or replace function validate_redemption(p_code text)
returns table (
  redemption_id uuid,
  code          text,
  coupon_title  text,
  merchant_name text,
  coins_spent   integer,
  used_at       timestamptz
)
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_r coupon_redemptions%rowtype;
  v_c coupons%rowtype;
  v_m merchants%rowtype;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  select * into v_r from coupon_redemptions
    where redemption_code = upper(btrim(p_code)) for update;
  if not found then
    raise exception 'Código inválido';
  end if;

  select * into v_c from coupons    where id = v_r.coupon_id;
  select * into v_m from merchants  where id = v_c.merchant_id;

  -- Anti-suplantación: solo el comercio dueño del cupón puede validarlo.
  if not is_merchant_member(v_c.merchant_id) then
    raise exception 'Ese cupón no pertenece a tu comercio';
  end if;

  if v_r.status = 'used' then
    raise exception 'Código ya usado el %', to_char(v_r.used_at, 'DD/MM/YYYY HH24:MI');
  end if;

  if v_r.status = 'expired'
     or (v_r.use_expires_at is not null and now() > v_r.use_expires_at) then
    update coupon_redemptions set status = 'expired' where id = v_r.id;
    raise exception 'Código expirado';
  end if;

  update coupon_redemptions
    set status = 'used', used_at = now()
    where id = v_r.id
    returning * into v_r;

  return query select v_r.id, v_r.redemption_code, v_c.title, v_m.name, v_r.coins_spent, v_r.used_at;
end;
$$;

grant execute on function is_merchant_member(uuid)  to authenticated;
grant execute on function validate_redemption(text) to authenticated;
grant execute on function redeem_coupon(uuid)       to authenticated;
grant execute on all functions in schema public     to service_role;
