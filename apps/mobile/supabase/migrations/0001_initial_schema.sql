-- Arbu Games — esquema inicial
-- Alineado con docs/arbu-games-documento-base.md (secciones 5.2, 10.3, 13.1–13.8).
-- Principio central: pagos y contadores son SERVER-AUTHORITATIVE (triggers/funciones
-- security definer). El cliente nunca escribe coins ni validations_count.

-- ============================================================
-- Extensiones
-- ============================================================
create extension if not exists pgcrypto;   -- gen_random_uuid()

-- ============================================================
-- Enums
-- ============================================================
create type tree_health          as enum ('good','regular','poor','dead');
create type tree_status          as enum ('pending','stalled','validated','unverifiable','rejected');
create type tree_origin          as enum ('planted','existing');       -- inmutable (13.1.1)
create type tree_source          as enum ('arbu_games','arbu_migration'); -- 5.2
create type tree_lifecycle_stage as enum ('seedling','young','mature'); -- mutable (13.1.1)
create type benefit_type         as enum ('product','discount','service','ticket'); -- 13.3
create type redemption_location  as enum ('app','on_site');            -- canje app vs en el lugar (13.3)
create type coupon_tier          as enum ('short','medium','long');    -- 13.3.1
create type redemption_status    as enum ('claimed','used','expired'); -- 13.3
create type wallet_txn_type      as enum ('earn','redeem');
create type tree_report_reason   as enum ('suspicious','damaged','dead','other'); -- flag ciudadano (13.7 #4)

-- ============================================================
-- app_config — perillas ajustables (earn_rate / value_rate, 13.3)
-- ============================================================
create table app_config (
  key         text primary key,
  value       jsonb not null,
  description text,
  updated_at  timestamptz not null default now()
);

insert into app_config (key, value, description) values
  ('earn_rate',          '{"register_tree": 0, "validate_tree": 30}', 'Coins por acción. register_tree=0: pago SOLO al validar (13.2). Reparto por participante.'),
  ('value_rate',         '{"coins_per_bs": 10}',                       'Referencia interna de solvencia: 1 Bs = 10 coins (13.3). No visible al usuario.'),
  ('validation_threshold','3',                                         'Verificadores distintos requeridos para validar (modelo 1+3).'),
  ('duplicate_radius_m', '25',                                         'Radio (m) para detección de duplicados al registrar (13.1).');

-- ============================================================
-- profiles
-- ============================================================
create table profiles (
  id                     uuid primary key references auth.users(id) on delete cascade,
  created_at             timestamptz not null default now(),
  username               text not null unique,
  avatar_url             text,
  coins                  integer not null default 0 check (coins >= 0),
  total_trees_mapped     integer not null default 0,
  total_trees_validated  integer not null default 0
);

-- ============================================================
-- species — catálogo (reuso del catálogo de Arbu, 5.2)
-- ============================================================
create table species (
  id                        uuid primary key default gen_random_uuid(),
  created_at                timestamptz not null default now(),
  common_name               text not null,
  scientific_name           text,
  default_remonitoring_days integer   -- pista para re-monitoreo por especie (13.4, Fase 2)
);

-- ============================================================
-- trees
-- ============================================================
create table trees (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  user_id           uuid not null references profiles(id),
  latitude          double precision not null,
  longitude         double precision not null,
  gps_accuracy      real,                              -- metros reportados por el device (13.1)
  photo_url         text not null,                     -- foto en vivo, sellada en servidor (13.1)
  dap               real not null,                     -- diámetro a la altura del pecho (cm)
  health            tree_health not null,
  status            tree_status not null default 'pending',
  under_audit       boolean not null default false,    -- auditoría no borra el estado validado (13.7)
  audit_reason      text,
  validations_count integer not null default 0,        -- server-authoritative (trigger)
  species_id        uuid references species(id),
  species_name      text,                              -- fallback / "desconocido" (13.1)
  origin            tree_origin not null default 'existing',
  planted_date      date,                              -- solo cuando origin = 'planted'
  lifecycle_stage   tree_lifecycle_stage,
  source            tree_source not null default 'arbu_games',
  notes             text,
  constraint planted_date_only_for_planted
    check (planted_date is null or origin = 'planted')
);

-- Índice para búsqueda por radio (detección de duplicados / mapa).
-- Para producción evaluar PostGIS (geography + GiST); btree simple basta para el MVP.
create index trees_lat_lng_idx on trees (latitude, longitude);
create index trees_status_idx  on trees (status);

-- ============================================================
-- tree_validations — verificaciones del modelo 1+3 (13.2)
-- ============================================================
create table tree_validations (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  tree_id    uuid not null references trees(id) on delete cascade,
  user_id    uuid not null references profiles(id),
  photo_url  text not null,
  health     tree_health not null,
  latitude   double precision,   -- ubicación del verificador (anti-fraude: estuvo en el lugar)
  longitude  double precision,
  notes      text,
  unique (tree_id, user_id)      -- un usuario verifica un árbol dado una sola vez
);

-- ============================================================
-- merchants — comercios (13.3 / 13.8)
-- ============================================================
create table merchants (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  name            text not null,
  category        text,
  logo_url        text,
  latitude        double precision,
  longitude       double precision,
  address         text,
  commission_rate numeric(4,3) not null default 0.15,  -- 15% (rango 15-20%, 10.1)
  active          boolean not null default true
);

-- ============================================================
-- coupons — plantilla definida por el comercio (13.3 / 13.3.1)
-- ============================================================
create table coupons (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  merchant_id         uuid not null references merchants(id) on delete cascade,
  title               text not null,
  description         text,
  category            text,
  benefit_type        benefit_type not null,
  price_coins         integer not null check (price_coins > 0),
  tier                coupon_tier,                             -- corto/medio/largo (13.3.1)
  redemption_location redemption_location not null default 'app',
  quota               integer check (quota is null or quota >= 0),   -- null = indefinido
  quota_remaining     integer check (quota_remaining is null or quota_remaining >= 0),
  claim_window_start  timestamptz,   -- reloj 1: reclamo. null = disponible ya
  claim_window_end    timestamptz,   -- null = indefinido
  use_window_days     integer,       -- reloj 2: uso post-reclamo (días). null = indefinido
  active              boolean not null default true
);

-- ============================================================
-- coupon_redemptions — instancia reclamada/usada por un usuario (13.3)
-- ============================================================
create table coupon_redemptions (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  coupon_id       uuid not null references coupons(id),
  user_id         uuid not null references profiles(id),
  status          redemption_status not null default 'claimed',
  claimed_at      timestamptz not null default now(),
  used_at         timestamptz,       -- on_site: claimed_at == used_at
  use_expires_at  timestamptz,       -- claimed_at + use_window_days
  redemption_code text not null unique,
  coins_spent     integer not null check (coins_spent >= 0)
);

-- ============================================================
-- wallet_transactions — historial de coins (earn/redeem)
-- ============================================================
create table wallet_transactions (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),
  user_id               uuid not null references profiles(id),
  amount                integer not null,             -- +earn / -redeem
  type                  wallet_txn_type not null,
  description           text not null,
  tree_id               uuid references trees(id),
  coupon_redemption_id  uuid references coupon_redemptions(id)
);

-- ============================================================
-- tree_reports — flag ciudadano, alimenta disparador de auditoría (13.7 #4)
-- ============================================================
create table tree_reports (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  tree_id    uuid not null references trees(id) on delete cascade,
  user_id    uuid not null references profiles(id),
  reason     tree_report_reason not null,
  notes      text
);

-- ============================================================
-- Trigger: contador de árboles mapeados (server-authoritative)
-- ============================================================
create or replace function handle_new_tree()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update profiles set total_trees_mapped = total_trees_mapped + 1
    where id = new.user_id;
  return new;
end;
$$;

create trigger on_tree_insert
  after insert on trees
  for each row execute function handle_new_tree();

-- ============================================================
-- Trigger: modelo 1+3 — al 3er verificador, validar y pagar (13.2)
-- Pago SOLO al validar. earn_rate.validate_tree por participante
-- (registrante + verificadores). Ajustable en app_config.
-- ============================================================
create or replace function handle_new_validation()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_tree      trees%rowtype;
  v_threshold integer;
  v_reward    integer;
  v_count     integer;
begin
  select * into v_tree from trees where id = new.tree_id for update;

  -- El registrante no puede validar su propio árbol.
  if v_tree.user_id = new.user_id then
    raise exception 'El registrante no puede validar su propio árbol';
  end if;

  v_threshold := coalesce((select value::text::int from app_config where key = 'validation_threshold'), 3);
  v_reward    := coalesce((select (value ->> 'validate_tree')::int from app_config where key = 'earn_rate'), 30);

  update trees
    set validations_count = validations_count + 1, updated_at = now()
    where id = new.tree_id
    returning validations_count into v_count;

  -- Al alcanzar el umbral y si aún no está validado: validar + pagar a los participantes.
  if v_count >= v_threshold and v_tree.status in ('pending','stalled') then
    update trees set status = 'validated', updated_at = now() where id = new.tree_id;

    -- Registrante
    update profiles set coins = coins + v_reward,
                        total_trees_validated = total_trees_validated + 1
      where id = v_tree.user_id;
    insert into wallet_transactions (user_id, amount, type, description, tree_id)
      values (v_tree.user_id, v_reward, 'earn', 'Árbol validado (registrante)', new.tree_id);

    -- Verificadores
    update profiles p set coins = coins + v_reward
      from tree_validations tv
      where tv.tree_id = new.tree_id and tv.user_id = p.id;
    insert into wallet_transactions (user_id, amount, type, description, tree_id)
      select tv.user_id, v_reward, 'earn', 'Verificación validada', new.tree_id
        from tree_validations tv where tv.tree_id = new.tree_id;
  end if;

  return new;
end;
$$;

create trigger on_validation_insert
  after insert on tree_validations
  for each row execute function handle_new_validation();

-- ============================================================
-- Función: canje de cupón atómico (anti doble-gasto, 13.3)
-- Verifica cupón (activo/cupo/ventana de reclamo) y saldo, descuenta coins,
-- decrementa cupo, crea la redención con código y ventana de uso.
-- ============================================================
-- search_path incluye `extensions`: gen_random_bytes (pgcrypto) vive ahí en Supabase.
create or replace function redeem_coupon(p_coupon_id uuid)
returns coupon_redemptions language plpgsql security definer set search_path = public, extensions as $$
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

  -- Cupo.
  if v_coupon.quota_remaining is not null and v_coupon.quota_remaining <= 0 then
    raise exception 'Cupón agotado';
  end if;

  -- Saldo suficiente.
  select coins into v_balance from profiles where id = v_uid for update;
  if v_balance < v_coupon.price_coins then
    raise exception 'Saldo insuficiente';
  end if;

  -- Descontar coins.
  update profiles set coins = coins - v_coupon.price_coins where id = v_uid;

  -- Decrementar cupo.
  if v_coupon.quota_remaining is not null then
    update coupons set quota_remaining = quota_remaining - 1 where id = p_coupon_id;
  end if;

  -- Ventana de uso (reloj 2).
  if v_coupon.use_window_days is not null then
    v_expires := now() + make_interval(days => v_coupon.use_window_days);
  end if;

  insert into coupon_redemptions (coupon_id, user_id, status, claimed_at, used_at, use_expires_at, redemption_code, coins_spent)
    values (
      p_coupon_id, v_uid,
      (case when v_coupon.redemption_location = 'on_site' then 'used' else 'claimed' end)::redemption_status,
      now(),
      case when v_coupon.redemption_location = 'on_site' then now() else null end,
      v_expires,
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
-- Row Level Security
-- ============================================================
alter table profiles            enable row level security;
alter table species             enable row level security;
alter table trees               enable row level security;
alter table tree_validations    enable row level security;
alter table merchants           enable row level security;
alter table coupons             enable row level security;
alter table coupon_redemptions  enable row level security;
alter table wallet_transactions enable row level security;
alter table tree_reports        enable row level security;
alter table app_config          enable row level security;

-- Lectura pública (autenticados)
create policy read_profiles   on profiles          for select to authenticated using (true);
create policy read_species    on species           for select to authenticated using (true);
create policy read_trees      on trees             for select to authenticated using (true);
create policy read_validations on tree_validations for select to authenticated using (true);
create policy read_merchants  on merchants         for select to authenticated using (active);
create policy read_coupons    on coupons           for select to authenticated using (active);
create policy read_config     on app_config        for select to authenticated using (true);

-- Escrituras del usuario
-- Perfil: puede insertar/actualizar SOLO su fila; coins y contadores se protegen
-- por column grants (abajo) — RLS no restringe columnas.
create policy insert_own_profile on profiles for insert to authenticated with check (auth.uid() = id);
create policy update_own_profile on profiles for update to authenticated using (auth.uid() = id);

-- Árboles: el usuario inserta como sí mismo. status/validations_count/under_audit
-- toman su default (no se otorga privilegio de columna al cliente).
create policy insert_own_tree on trees for insert to authenticated with check (auth.uid() = user_id);

-- Verificaciones: el usuario inserta como sí mismo (el trigger rechaza validar el árbol propio).
create policy insert_own_validation on tree_validations for insert to authenticated with check (auth.uid() = user_id);

-- Canjes / transacciones: solo lectura propia. La escritura pasa por redeem_coupon() (security definer).
create policy read_own_redemptions   on coupon_redemptions  for select to authenticated using (auth.uid() = user_id);
create policy read_own_transactions  on wallet_transactions for select to authenticated using (auth.uid() = user_id);

-- Reportes/flags: el usuario inserta como sí mismo.
create policy insert_own_report on tree_reports for insert to authenticated with check (auth.uid() = user_id);
create policy read_reports      on tree_reports for select to authenticated using (true);

-- ============================================================
-- Column grants — el cliente NO puede escribir coins ni contadores ni estado.
-- Los mutan solo las funciones security definer (dueño de la tabla).
-- ============================================================
revoke all on profiles from authenticated;
grant select on profiles to authenticated;
grant insert (id, username, avatar_url) on profiles to authenticated;
grant update (username, avatar_url)     on profiles to authenticated;

revoke all on trees from authenticated;
grant select on trees to authenticated;
grant insert (user_id, latitude, longitude, gps_accuracy, photo_url, dap, health,
              species_id, species_name, origin, planted_date, source, notes)
  on trees to authenticated;

-- Verificaciones (1+3) y reportes: el usuario inserta como sí mismo (RLS lo restringe).
grant insert (tree_id, user_id, photo_url, health, latitude, longitude, notes)
  on tree_validations to authenticated;
grant insert (tree_id, user_id, reason, notes)
  on tree_reports to authenticated;

-- Lectura del cliente: la RLS filtra filas, pero el rol necesita el GRANT de tabla
-- para que la política SELECT siquiera se evalúe (sin esto → 403 permission denied).
grant select on species, merchants, coupons, coupon_redemptions, wallet_transactions,
                tree_validations, tree_reports to authenticated;

-- merchants / coupons / species los gestiona el equipo (service role) en el MVP:
-- sin políticas de escritura para 'authenticated'.

-- service_role = rol backend/admin de confianza (p.ej. apps/admin con service_role key).
-- Bypassa RLS pero igual necesita GRANTs de tabla. Acceso full a public.
grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- ============================================================
-- Notas para Fase 2 (no bloqueadas por este esquema):
--  - Re-monitoreo (13.4): tabla tree_remonitorings + cadencia por especie.
--  - Auditoría formal (13.7): tabla audits + máquina que use under_audit/tree_reports.
--  - Reputación de usuario, comunidades/equipos, referidos, padrinazgo (13.6 Fase 2A).
--  - Misiones patrocinadas + portal de comercio (13.6 Fase 2B / 13.8).
-- ============================================================
