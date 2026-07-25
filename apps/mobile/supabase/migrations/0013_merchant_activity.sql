-- Actividad del comercio (Hipótesis 3).
--
-- La hipótesis dice que los comercios adoptan la plataforma si participan gratis,
-- ofrecen beneficios y "ven reportes de actividad". Hoy el comercio sólo puede
-- escanear un QR: no sabe cuántos canjes tuvo ni qué cupón funciona, así que la
-- hipótesis no se puede ni validar ni refutar.
--
-- Por qué RPC y no una policy de RLS: `coupon_redemptions` guarda el `user_id`
-- del ciudadano. Abrir esas filas al comercio le daría acceso a QUIÉN canjeó, no
-- sólo a cuánto se canjeó — y el doc pide reportes de actividad, no la identidad
-- de los clientes. Con funciones security definer que devuelven campos elegidos,
-- la identidad del ciudadano nunca sale del servidor.

-- ============================================================
-- merchant_activity — el resumen. Agrega TODOS los comercios de los que el
-- usuario es miembro (normalmente uno).
-- ============================================================
create or replace function merchant_activity()
returns table (
  coupons_active   integer,
  claimed_total    integer,
  used_total       integer,
  pending_use      integer,
  coins_total      integer,
  used_last_7d     integer,
  used_last_30d    integer
)
language sql stable security definer set search_path = public as $$
  with mine as (
    select merchant_id from merchant_members where user_id = auth.uid()
  ),
  my_coupons as (
    select c.id, c.active from coupons c join mine on mine.merchant_id = c.merchant_id
  ),
  r as (
    select cr.* from coupon_redemptions cr join my_coupons mc on mc.id = cr.coupon_id
  )
  select
    (select count(*) from my_coupons where active)::int,
    (select count(*) from r)::int,
    (select count(*) from r where status = 'used')::int,
    -- Reclamados que todavía no se usaron: son visitas que el comercio puede esperar.
    (select count(*) from r where status = 'claimed')::int,
    -- Monedas que el comercio "captó": sólo las de canjes efectivamente usados.
    coalesce((select sum(coins_spent) from r where status = 'used'), 0)::int,
    (select count(*) from r where status = 'used' and used_at >= now() - interval '7 days')::int,
    (select count(*) from r where status = 'used' and used_at >= now() - interval '30 days')::int;
$$;

-- ============================================================
-- merchant_coupon_stats — qué cupón funciona. Es el dato accionable: con esto
-- el comercio decide cuál repetir y cuál cambiar.
-- ============================================================
create or replace function merchant_coupon_stats()
returns table (
  coupon_id       uuid,
  title           text,
  price_coins     integer,
  active          boolean,
  quota_remaining integer,
  claimed         integer,
  used            integer
)
language sql stable security definer set search_path = public as $$
  with mine as (
    select merchant_id from merchant_members where user_id = auth.uid()
  )
  select
    c.id, c.title, c.price_coins, c.active, c.quota_remaining,
    (select count(*) from coupon_redemptions r where r.coupon_id = c.id)::int,
    (select count(*) from coupon_redemptions r where r.coupon_id = c.id and r.status = 'used')::int
  from coupons c
  join mine on mine.merchant_id = c.merchant_id
  order by (select count(*) from coupon_redemptions r where r.coupon_id = c.id) desc, c.title;
$$;

-- ============================================================
-- merchant_recent_redemptions — el registro reciente.
-- Deliberadamente SIN user_id ni dato del ciudadano: el comercio necesita saber
-- qué se canjeó y cuándo, no quién.
-- ============================================================
create or replace function merchant_recent_redemptions(p_limit integer default 20)
returns table (
  redemption_code text,
  coupon_title    text,
  status          redemption_status,
  claimed_at      timestamptz,
  used_at         timestamptz,
  coins_spent     integer
)
language sql stable security definer set search_path = public as $$
  with mine as (
    select merchant_id from merchant_members where user_id = auth.uid()
  )
  select r.redemption_code, c.title, r.status, r.claimed_at, r.used_at, r.coins_spent
  from coupon_redemptions r
  join coupons c on c.id = r.coupon_id
  join mine on mine.merchant_id = c.merchant_id
  order by coalesce(r.used_at, r.claimed_at) desc
  limit p_limit;
$$;

grant execute on function merchant_activity()                    to authenticated;
grant execute on function merchant_coupon_stats()                to authenticated;
grant execute on function merchant_recent_redemptions(integer)   to authenticated;
grant execute on all functions in schema public                  to service_role;
