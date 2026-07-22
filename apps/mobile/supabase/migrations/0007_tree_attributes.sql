-- Ficha del árbol + consenso 1+3 (13.1, 13.2).
--
-- Dos cambios de fondo:
--   1. El registro captura los atributos que un municipio o una universidad
--      pueden usar: especie, medida real (circunferencia→DAP), altura por rango,
--      contexto de plantación, conflictos con infraestructura, urgencia.
--   2. El verificador deja de ser un contador de presencia: responde los mismos
--      campos por su cuenta y, al completarse el 1+3, el servidor aplica MAYORÍA.
--      El valor que queda en `trees` es el consensuado por los 4 participantes,
--      no el que tipeó el registrante. Lo que no logra mayoría queda en
--      `disputed_fields` — dato marcado, nunca borrado (13.2).
--
-- Criterio para elegir campos: sólo entra lo que 3 desconocidos parados frente
-- al árbol pueden responder igual sin herramientas raras. Un campo no verificable
-- genera discrepancias que no significan nada y degrada la señal del 1+3.

-- ============================================================
-- Enums nuevos
-- ============================================================

-- Dónde está plantado: define régimen de riego/poda y si la gestión es pública
-- o privada. Es el corte que usa el municipio para presupuestar.
create type tree_site_context as enum (
  'sidewalk',      -- acera / jardinera de vereda
  'median',        -- camellón / mediana
  'plaza_park',    -- plaza o parque
  'riverside',     -- área verde de río / canal
  'private_yard',  -- patio privado visible desde la vía
  'other'
);

-- Altura en rangos anclados. En metros exactos nadie coincide; en rangos sí.
create type tree_height_band as enum ('lt3', 'b3_6', 'b6_12', 'gt12');

-- Conflictos con infraestructura — binarios y visibles. El mapa de conflictos
-- es la entrada directa de un plan de poda.
create type tree_conflict as enum (
  'overhead_cables',  -- cables aéreos cruzando la copa
  'sidewalk_damage',  -- vereda levantada por raíces
  'pole_or_light',    -- poste o luminaria dentro de la copa
  'small_pit',        -- alcorque chico (< ~1 m)
  'against_wall'      -- apoyado o pegado a un muro
);

-- Atención urgente. Complementa tree_reports (flag ciudadano posterior, 13.7):
-- esto es lo que se ve en el momento del registro/verificación.
create type tree_urgency as enum (
  'none',
  'dry_dead',           -- seco / muerto en pie
  'burned',             -- quemado
  'pest',               -- plaga o enfermedad visible
  'mechanical_damage',  -- daño mecánico (choque, corte, anillado)
  'being_felled'        -- tala en curso
);

-- ============================================================
-- trees — ficha ampliada
-- ============================================================
alter table trees
  add column circumference_cm real check (circumference_cm is null or circumference_cm > 0),
  add column height_band      tree_height_band,
  add column site_context     tree_site_context,
  add column conflicts        tree_conflict[] not null default '{}',
  add column urgency          tree_urgency not null default 'none',
  add column photo_trunk_url  text,             -- 2ª foto: tronco a la altura del pecho
  add column disputed_fields  text[] not null default '{}';  -- campos sin mayoría en el 1+3

comment on column trees.circumference_cm is
  'Circunferencia medida con cinta (cm). Fuente de verdad de la medida: el DAP se deriva de acá (13.1). Tres personas con cinta coinciden; estimando DAP a ojo, no.';
comment on column trees.disputed_fields is
  'Campos donde el 1+3 no alcanzó mayoría. El valor se mantiene, pero queda marcado como no consensuado.';

-- ============================================================
-- tree_validations — el verificador responde lo mismo, por su cuenta
-- ============================================================
alter table tree_validations
  add column species_id       uuid references species(id),
  add column species_name     text,
  add column circumference_cm real check (circumference_cm is null or circumference_cm > 0),
  add column height_band      tree_height_band,
  add column site_context     tree_site_context,
  add column conflicts        tree_conflict[],
  add column urgency          tree_urgency,
  add column photo_trunk_url  text;

-- ============================================================
-- Perilla de tolerancia de la medida
-- ============================================================
insert into app_config (key, value, description) values
  ('measurement_tolerance_pct', '15',
   'Dispersión máxima (%) entre las circunferencias reportadas por los 4 participantes antes de marcar la medida como disputada (13.2).')
on conflict (key) do nothing;

-- ============================================================
-- DAP derivado de la circunferencia — server-authoritative.
-- El cliente puede mandar dap (la columna es NOT NULL desde 0001), pero si hay
-- circunferencia, el servidor la recalcula: una sola fuente de verdad.
-- ============================================================
create or replace function set_dap_from_circumference()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.circumference_cm is not null then
    new.dap := round((new.circumference_cm / pi())::numeric, 1);
  end if;
  return new;
end;
$$;

create trigger trees_dap_from_circumference
  before insert or update of circumference_cm on trees
  for each row execute function set_dap_from_circumference();

-- ============================================================
-- majority_text — ganador por mayoría simple sobre un conjunto de votos.
-- disputed = nadie llegó a 2 votos, o hay empate en el primer puesto.
-- Se trabaja en text para reusar la misma función con enums y uuids.
-- ============================================================
create or replace function majority_text(p_vals text[])
returns table (winner text, disputed boolean)
language sql immutable as $$
  with v    as (select x from unnest(coalesce(p_vals, '{}'::text[])) x where x is not null),
       t    as (select x, count(*)::int as c from v group by x),
       best as (select coalesce(max(c), 0) as top from t)
  select
    (select t.x from t, best where t.c = best.top order by t.x limit 1),
    (select best.top < 2
         or (select count(*) from t where t.c = best.top) > 1
       from best);
$$;

-- ============================================================
-- apply_validation_consensus — corre al completarse el 1+3.
-- Votan el registrante y todos los verificadores. Cada campo se resuelve por
-- separado: un desacuerdo sobre la especie no invalida la medida ni la salud.
-- ============================================================
create or replace function apply_validation_consensus(p_tree_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_tree      trees%rowtype;
  v_voters    int;
  v_disputed  text[] := '{}';
  v_res       record;
  v_species   uuid;
  v_health    tree_health;
  v_context   tree_site_context;
  v_band      tree_height_band;
  v_urgency   tree_urgency;
  v_circ      numeric;
  v_spread    numeric;
  v_tol       numeric;
  v_conflicts tree_conflict[];
begin
  select * into v_tree from trees where id = p_tree_id for update;
  select 1 + count(*) into v_voters from tree_validations where tree_id = p_tree_id;

  -- Regla común a todos los campos categóricos:
  --   sin votos            → no hay nada que consensuar, queda lo que había;
  --   sin mayoría/empate   → se CONSERVA lo del registrante y se marca disputado
  --                          (elegir un valor arbitrario sería peor que no elegir);
  --   con mayoría          → gana el valor votado.

  -- Especie
  select * into v_res from majority_text(
    array(select v_tree.species_id::text
          union all
          select species_id::text from tree_validations where tree_id = p_tree_id));
  v_species := v_tree.species_id;
  if v_res.winner is not null then
    if v_res.disputed then v_disputed := v_disputed || 'species'::text;
    else v_species := v_res.winner::uuid; end if;
  end if;

  -- Estado fitosanitario (el verificador ahora evalúa por su cuenta)
  select * into v_res from majority_text(
    array(select v_tree.health::text
          union all
          select health::text from tree_validations where tree_id = p_tree_id));
  v_health := v_tree.health;
  if v_res.winner is not null then
    if v_res.disputed then v_disputed := v_disputed || 'health'::text;
    else v_health := v_res.winner::tree_health; end if;
  end if;

  -- Contexto de plantación
  select * into v_res from majority_text(
    array(select v_tree.site_context::text
          union all
          select site_context::text from tree_validations where tree_id = p_tree_id));
  v_context := v_tree.site_context;
  if v_res.winner is not null then
    if v_res.disputed then v_disputed := v_disputed || 'site_context'::text;
    else v_context := v_res.winner::tree_site_context; end if;
  end if;

  -- Altura por rango
  select * into v_res from majority_text(
    array(select v_tree.height_band::text
          union all
          select height_band::text from tree_validations where tree_id = p_tree_id));
  v_band := v_tree.height_band;
  if v_res.winner is not null then
    if v_res.disputed then v_disputed := v_disputed || 'height_band'::text;
    else v_band := v_res.winner::tree_height_band; end if;
  end if;

  -- Urgencia
  select * into v_res from majority_text(
    array(select v_tree.urgency::text
          union all
          select urgency::text from tree_validations where tree_id = p_tree_id));
  v_urgency := v_tree.urgency;
  if v_res.winner is not null then
    if v_res.disputed then v_disputed := v_disputed || 'urgency'::text;
    else v_urgency := v_res.winner::tree_urgency; end if;
  end if;

  -- Circunferencia: numérica, no categórica. Mediana como valor de consenso y
  -- dispersión relativa como criterio de disputa (una cinta mal puesta se nota).
  v_tol := coalesce((select value::text::numeric from app_config where key = 'measurement_tolerance_pct'), 15);

  with vals as (
    select v_tree.circumference_cm::numeric as x
    union all
    select circumference_cm::numeric from tree_validations where tree_id = p_tree_id
  ), clean as (select x from vals where x is not null)
  select
    percentile_cont(0.5) within group (order by x),
    case when count(*) < 2 or percentile_cont(0.5) within group (order by x) = 0 then null
         else (max(x) - min(x)) * 100 / percentile_cont(0.5) within group (order by x) end
  into v_circ, v_spread
  from clean;

  -- Igual que arriba: si las medidas no se parecen entre sí, la mediana no
  -- representa nada. Se conserva la del registrante y se marca disputada.
  if v_circ is not null and v_spread is not null and v_spread > v_tol then
    v_disputed := v_disputed || 'circumference_cm'::text;
    v_circ := v_tree.circumference_cm;
  end if;

  -- Conflictos: no es una opción entre varias, son banderas independientes.
  -- Cada una sobrevive si la vio la mayoría de los participantes.
  select coalesce(array_agg(flag order by flag), '{}')
    into v_conflicts
  from (
    select flag, count(*) as c
    from (
      select unnest(v_tree.conflicts) as flag
      union all
      select unnest(conflicts) from tree_validations where tree_id = p_tree_id and conflicts is not null
    ) f
    group by flag
  ) g
  where g.c * 2 >= v_voters;

  update trees set
    species_id       = v_species,
    health           = v_health,
    site_context     = v_context,
    height_band      = v_band,
    urgency          = v_urgency,
    circumference_cm = coalesce(v_circ::real, circumference_cm),
    conflicts        = v_conflicts,
    disputed_fields  = v_disputed,
    updated_at       = now()
  where id = p_tree_id;
end;
$$;

-- ============================================================
-- handle_new_validation — reemplaza la de 0006: mismo geofence + consenso al 3ro.
-- ============================================================
create or replace function handle_new_validation()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_tree      trees%rowtype;
  v_threshold integer;
  v_reward    integer;
  v_count     integer;
  v_radius    double precision;
  v_dist      double precision;
begin
  select * into v_tree from trees where id = new.tree_id for update;

  if v_tree.user_id = new.user_id then
    raise exception 'El registrante no puede validar su propio árbol';
  end if;

  if new.latitude is null or new.longitude is null then
    raise exception 'Falta tu ubicación: la verificación tiene que hacerse en el lugar';
  end if;

  v_radius := coalesce((select value::text::numeric from app_config where key = 'verify_radius_m'), 30);
  v_dist   := distance_m(v_tree.latitude, v_tree.longitude, new.latitude, new.longitude);

  if v_dist > v_radius then
    raise exception 'Estás a % m del árbol (máximo % m). Acercate para verificarlo.',
      round(v_dist::numeric), round(v_radius::numeric);
  end if;

  v_threshold := coalesce((select value::text::int from app_config where key = 'validation_threshold'), 3);
  v_reward    := coalesce((select (value ->> 'validate_tree')::int from app_config where key = 'earn_rate'), 30);

  update trees
    set validations_count = validations_count + 1, updated_at = now()
    where id = new.tree_id
    returning validations_count into v_count;

  if v_count >= v_threshold and v_tree.status in ('pending','stalled') then
    -- Primero el consenso: el árbol queda validado con los valores votados,
    -- no con los que propuso el registrante.
    perform apply_validation_consensus(new.tree_id);

    update trees set status = 'validated', updated_at = now() where id = new.tree_id;

    update profiles set coins = coins + v_reward,
                        total_trees_validated = total_trees_validated + 1
      where id = v_tree.user_id;
    insert into wallet_transactions (user_id, amount, type, description, tree_id)
      values (v_tree.user_id, v_reward, 'earn', 'Árbol validado (registrante)', new.tree_id);

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

-- ============================================================
-- Grants — el cliente escribe los campos nuevos; status/contadores siguen fuera.
-- ============================================================
grant insert (circumference_cm, height_band, site_context, conflicts, urgency, photo_trunk_url)
  on trees to authenticated;

grant insert (species_id, species_name, circumference_cm, height_band, site_context,
              conflicts, urgency, photo_trunk_url)
  on tree_validations to authenticated;

grant execute on function majority_text(text[])            to authenticated;
grant execute on all functions in schema public            to service_role;
