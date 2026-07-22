-- Misiones diarias (13.6, capa hábito del MVP).
--
-- Tres decisiones que definen el diseño:
--
-- 1. El progreso NO se guarda: se calcula de las acciones que ya existen
--    (trees.created_at, tree_validations.created_at). Un contador de progreso
--    escribible es superficie de fraude gratis, y además se desincroniza del
--    dato real. Lo único que se persiste es el CANJE de la recompensa.
--
-- 2. Las misiones del día son las mismas para todos y se eligen de forma
--    determinística por fecha: sin cron, sin tabla de asignaciones, y dos
--    usuarios pueden hablar de "la misión de hoy" y estar hablando de lo mismo.
--
-- 3. Al menos una misión empuja los árboles pendientes. El doc (13.2) marca que
--    el pago sólo ocurre al validar, así que el registrante honesto depende de
--    que alguien vaya a verificar: la misión es el empujón.
--
-- Las misiones patrocinadas (13.6 Fase 2B) son otra cosa y no entran acá.

create type mission_kind as enum (
  'map_trees',          -- registrar N árboles hoy
  'map_with_species',   -- registrar N árboles identificando la especie
  'verify_trees',       -- verificar N árboles hoy
  'close_validation'    -- verificar árboles que quedaron validados con tu voto
);

create table missions (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  code         text not null unique,       -- estable, para textos y analítica
  kind         mission_kind not null,
  title        text not null,
  description  text not null,
  target       integer not null check (target > 0),
  reward_coins integer not null check (reward_coins >= 0),
  active       boolean not null default true
);

-- Canje de la recompensa. El unique es el anti doble-pago: una misión por
-- usuario por día, sin importar cuántas veces toque el botón.
create table mission_claims (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id    uuid not null references profiles(id) on delete cascade,
  mission_id uuid not null references missions(id) on delete cascade,
  claim_day  date not null,
  coins      integer not null check (coins >= 0),
  unique (user_id, mission_id, claim_day)
);

create index mission_claims_user_day_idx on mission_claims (user_id, claim_day);

insert into app_config (key, value, description) values
  ('daily_missions_count', '3', 'Cuántas misiones diarias se muestran (13.6).')
on conflict (key) do nothing;

-- ============================================================
-- Catálogo inicial. Va en la migración y no en seed.sql: sin misiones la
-- pantalla de inicio queda vacía también en producción.
-- Recompensas calibradas contra earn_rate.validate_tree (30): una misión rinde
-- menos que completar un 1+3, para que no compita con el loop principal.
-- ============================================================
insert into missions (code, kind, title, description, target, reward_coins) values
  ('map_one',        'map_trees',        'Mapeador Iniciado',  'Mapea 1 árbol nuevo en tu zona',                      1, 20),
  ('map_three',      'map_trees',        'Jornada de Campo',   'Mapea 3 árboles en el día',                           3, 50),
  ('species_two',    'map_with_species', 'Ojo Botánico',       'Registra 2 árboles identificando su especie',         2, 35),
  ('verify_two',     'verify_trees',     'Ojo de Halcón',      'Verifica 2 árboles pendientes',                       2, 30),
  ('verify_four',    'verify_trees',     'Patrulla Verde',     'Verifica 4 árboles en el día',                        4, 60),
  ('close_one',      'close_validation', 'Cierre Comunitario', 'Sé la verificación que deja un árbol validado',       1, 40);

-- ============================================================
-- today_start_bo — inicio del día en Cochabamba. En UTC el día "de hoy"
-- arranca a las 20:00 de ayer local y las misiones se reiniciarían de tarde.
-- ============================================================
create or replace function today_start_bo()
returns timestamptz language sql stable as $$
  select (date_trunc('day', now() at time zone 'America/La_Paz')) at time zone 'America/La_Paz';
$$;

-- ============================================================
-- daily_missions — misiones de hoy con el progreso REAL del usuario.
-- La selección del día sale de un hash (fecha, id): estable dentro del día,
-- distinta entre días, sin proceso que la asigne.
-- ============================================================
create or replace function daily_missions()
returns table (
  mission_id   uuid,
  code         text,
  kind         mission_kind,
  title        text,
  description  text,
  target       integer,
  reward_coins integer,
  progress     integer,
  completed    boolean,
  claimed      boolean
)
language sql stable security invoker set search_path = public as $$
  with me as (select auth.uid() as uid),
       day as (select (now() at time zone 'America/La_Paz')::date as d, today_start_bo() as since),
       picked as (
         select m.*
         from missions m, day
         where m.active
         order by md5(day.d::text || m.id::text)
         limit coalesce((select value::text::int from app_config where key = 'daily_missions_count'), 3)
       ),
       prog as (
         select
           p.id,
           case p.kind
             when 'map_trees' then (
               select count(*) from trees t, me, day
               where t.user_id = me.uid and t.created_at >= day.since
             )
             when 'map_with_species' then (
               -- "Identificando la especie" excluye el registro con Desconocido:
               -- si contara, la misión premiaría el no-dato.
               select count(*) from trees t
               join species s on s.id = t.species_id, me, day
               where t.user_id = me.uid and t.created_at >= day.since
                 and lower(s.common_name) <> 'desconocido'
             )
             when 'verify_trees' then (
               select count(*) from tree_validations v, me, day
               where v.user_id = me.uid and v.created_at >= day.since
             )
             when 'close_validation' then (
               -- Tu verificación cerró el 1+3: contás las de hoy sobre árboles
               -- que hoy están validados.
               select count(*) from tree_validations v
               join trees t on t.id = v.tree_id, me, day
               where v.user_id = me.uid and v.created_at >= day.since
                 and t.status = 'validated'
             )
           end::integer as progress
         from picked p
       )
  select
    p.id, p.code, p.kind, p.title, p.description, p.target, p.reward_coins,
    least(prog.progress, p.target),
    prog.progress >= p.target,
    exists (
      select 1 from mission_claims c, me, day
      where c.user_id = me.uid and c.mission_id = p.id and c.claim_day = day.d
    )
  from picked p
  join prog on prog.id = p.id, day
  order by p.reward_coins;
$$;

-- ============================================================
-- claim_mission — paga la recompensa. Recalcula el progreso en el servidor:
-- que el cliente diga "la completé" no es evidencia de nada.
-- ============================================================
create or replace function claim_mission(p_mission_id uuid)
returns table (coins_awarded integer, new_balance integer)
language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_day     date;
  v_m       record;
  v_balance integer;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  v_day := (now() at time zone 'America/La_Paz')::date;

  -- daily_missions() ya trae progreso y estado; se reusa para no duplicar la
  -- definición de "completada" en dos lugares.
  select * into v_m from daily_missions() dm where dm.mission_id = p_mission_id;

  if not found then
    raise exception 'Esa misión no está activa hoy';
  end if;
  if not v_m.completed then
    raise exception 'Misión incompleta (%/%)', v_m.progress, v_m.target;
  end if;
  if v_m.claimed then
    raise exception 'Ya reclamaste esta misión hoy';
  end if;

  -- El unique (user, mission, day) es el que decide en una carrera: si dos
  -- toques entran a la vez, el segundo choca acá y no paga dos veces.
  insert into mission_claims (user_id, mission_id, claim_day, coins)
    values (v_uid, p_mission_id, v_day, v_m.reward_coins);

  update profiles set coins = coins + v_m.reward_coins
    where id = v_uid
    returning coins into v_balance;

  insert into wallet_transactions (user_id, amount, type, description)
    values (v_uid, v_m.reward_coins, 'earn', 'Misión: ' || v_m.title);

  return query select v_m.reward_coins, v_balance;
end;
$$;

-- ============================================================
-- RLS / grants
-- ============================================================
alter table missions       enable row level security;
alter table mission_claims enable row level security;

create policy read_missions on missions for select to authenticated using (active);
-- Los canjes son privados: sólo los propios. La escritura pasa por claim_mission().
create policy read_own_claims on mission_claims for select to authenticated using (user_id = auth.uid());

grant select on missions, mission_claims to authenticated;
grant all    on missions, mission_claims to service_role;

grant execute on function today_start_bo()      to authenticated;
grant execute on function daily_missions()      to authenticated;
grant execute on function claim_mission(uuid)   to authenticated;
grant execute on all functions in schema public to service_role;
