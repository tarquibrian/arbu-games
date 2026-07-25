-- Máquina de estados del registro (13.2) — que el registrante honesto cobre.
--
-- El problema que resuelve: el pago ocurre SÓLO al validarse el árbol, así que
-- un registro honesto que junta 2 verificaciones y se queda ahí no le paga a
-- nadie, para siempre. El doc lo anticipa: el sistema "exige empujar
-- activamente la verificación de los pendientes honestos para que el
-- registrante honesto termine cobrando".
--
-- Hasta ahora el enum tree_status tenía 5 valores pero sólo se escribían dos
-- (`pending` por default, `validated` por el trigger). Esta migración cierra
-- la máquina:
--
--   pending ──(tiempo sin llegar a 3)──> ESTANCADO ──(3 verificaciones)──> validated
--                                            │
--                                            └──(N "fui y no está")──> unverifiable
--
-- Decisión de diseño: "estancado" NO se persiste. Es una función pura de
-- (created_at, validations_count, now) — no hay decisión ni evidencia humana
-- detrás, así que persistirlo exigiría un cron que lo mantenga al día y que
-- puede quedar desfasado. Se computa, igual que el progreso de misiones (0009)
-- y las rachas (0010). `unverifiable` SÍ se persiste: eso sí es una conclusión
-- basada en evidencia, y es terminal.

-- ============================================================
-- Perillas
-- ============================================================
insert into app_config (key, value, description) values
  ('stalled_after_days', '14',
   'Días que un registro puede estar pendiente sin completar el 1+3 antes de considerarse estancado (13.2).'),
  ('stalled_bonus_rate', '1.5',
   'Multiplicador de recompensa para quien verifica un árbol estancado. Es el empujón que atrae verificadores a los pendientes olvidados (13.2).'),
  ('not_found_threshold', '3',
   'Cuántos usuarios distintos deben reportar "fui y no está" para marcar un árbol como no verificable (13.2).')
on conflict (key) do nothing;

-- "Fui al lugar y no encontré nada" — la evidencia que sostiene el estado
-- terminal. Los valores que ya existían (suspicious/damaged/dead/other) son
-- para otra cosa: describen un árbol que SÍ está.
alter type tree_report_reason add value if not exists 'not_found';

-- Un usuario, un reporte por motivo. Sin esto una sola persona podría reportar
-- tres veces y marcar sola un árbol como no verificable.
alter table tree_reports add constraint tree_reports_user_tree_reason_key
  unique (tree_id, user_id, reason);

-- ============================================================
-- tree_is_stalled — el estado computado.
-- ============================================================
create or replace function tree_is_stalled(
  p_status     tree_status,
  p_created_at timestamptz,
  p_count      integer
) returns boolean
language sql stable security invoker set search_path = public as $$
  select p_status = 'pending'
     and p_count < coalesce((select value::text::int from app_config where key = 'validation_threshold'), 3)
     and p_created_at < now() - make_interval(days =>
           coalesce((select value::text::int from app_config where key = 'stalled_after_days'), 14));
$$;

-- Columna computada para PostgREST: permite pedir `is_stalled` en un select
-- normal de `trees`. El mapa de verificación necesita el flag sobre la misma
-- consulta que ya hace (mantiene visibles los propios y los ya verificados, que
-- verification_queue excluye a propósito), sin replicar la fórmula en el cliente.
create or replace function is_stalled(t trees)
returns boolean
language sql stable security invoker set search_path = public as $$
  select tree_is_stalled(t.status, t.created_at, t.validations_count);
$$;

-- ============================================================
-- verification_queue — el empujón.
--
-- Es la cola de verificación priorizada: primero los estancados (que son los
-- que necesitan rescate), después los más viejos. Devuelve la recompensa YA
-- calculada con el bono, para que la pantalla pueda mostrar "+45" en vez de
-- "+30" sin replicar la fórmula en el cliente.
--
-- Excluye los propios (no podés validar tu árbol) y los que ya verificaste:
-- ahí no hay nada que hacer, y ocupan lugar en la cola.
-- ============================================================
create or replace function verification_queue(
  p_lat   double precision default null,
  p_lng   double precision default null,
  p_limit integer default 50
) returns table (
  id                uuid,
  latitude          double precision,
  longitude         double precision,
  photo_url         text,
  species_name      text,
  validations_count integer,
  created_at        timestamptz,
  is_stalled        boolean,
  days_waiting      integer,
  reward_coins      integer,
  distance_meters   double precision
)
language sql stable security invoker set search_path = public as $$
  with cfg as (
    select
      coalesce((select (value ->> 'validate_tree')::int from app_config where key = 'earn_rate'), 30) as base,
      coalesce((select value::text::numeric from app_config where key = 'stalled_bonus_rate'), 1.5)   as bonus
  ),
  me as (select auth.uid() as uid)
  select
    t.id, t.latitude, t.longitude, t.photo_url, t.species_name, t.validations_count, t.created_at,
    tree_is_stalled(t.status, t.created_at, t.validations_count),
    extract(day from now() - t.created_at)::integer,
    (case when tree_is_stalled(t.status, t.created_at, t.validations_count)
          then round(cfg.base * cfg.bonus)
          else cfg.base end)::integer,
    case when p_lat is null or p_lng is null then null
         else distance_m(t.latitude, t.longitude, p_lat, p_lng) end
  from trees t, cfg, me
  where t.status = 'pending'
    and t.user_id <> me.uid
    and not exists (
      select 1 from tree_validations v
      where v.tree_id = t.id and v.user_id = me.uid
    )
  -- Estancados primero: son los que no se rescatan solos.
  order by tree_is_stalled(t.status, t.created_at, t.validations_count) desc, t.created_at asc
  limit p_limit;
$$;

-- ============================================================
-- report_tree_not_found — el camino al estado terminal.
--
-- No borra nada: un árbol que nadie encuentra es señal de fraude, y esa señal
-- es dato valioso. Queda archivado como `unverifiable`.
-- ============================================================
create or replace function report_tree_not_found(p_tree_id uuid, p_notes text default null)
returns table (reports integer, marked_unverifiable boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_uid       uuid := auth.uid();
  v_tree      trees%rowtype;
  v_threshold integer;
  v_reports   integer;
  v_marked    boolean := false;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  select * into v_tree from trees where id = p_tree_id for update;
  if not found then
    raise exception 'Ese árbol no existe';
  end if;

  -- Reportar el propio árbol no es evidencia de nada.
  if v_tree.user_id = v_uid then
    raise exception 'No podés reportar tu propio registro';
  end if;

  -- Un árbol ya validado fue encontrado por tres personas: si ahora no está,
  -- eso es re-monitoreo (13.4, Fase 2), no un registro falso.
  if v_tree.status <> 'pending' then
    raise exception 'Sólo se puede reportar como no encontrado un árbol pendiente';
  end if;

  insert into tree_reports (tree_id, user_id, reason, notes)
    values (p_tree_id, v_uid, 'not_found', p_notes)
    on conflict (tree_id, user_id, reason) do nothing;

  v_threshold := coalesce((select value::text::int from app_config where key = 'not_found_threshold'), 3);

  -- Distintos: el unique de arriba ya lo garantiza, pero contar así deja la
  -- intención explícita — lo que importa son personas, no reportes.
  select count(distinct user_id)::int into v_reports
    from tree_reports where tree_id = p_tree_id and reason = 'not_found';

  if v_reports >= v_threshold then
    update trees set status = 'unverifiable', updated_at = now() where id = p_tree_id;
    v_marked := true;
  end if;

  return query select v_reports, v_marked;
end;
$$;

-- ============================================================
-- handle_new_validation — pagar el bono del estancado.
--
-- El bono va a los VERIFICADORES, no al registrante: es lo que el doc pide que
-- haga la recompensa escalante ("atraer verificadores"). El registrante cobra
-- la base — su problema no era el monto, era que nadie iba a verificar.
--
-- Se recalcula el estado ANTES de sumar esta verificación: si el árbol estaba
-- estancado cuando llegó el rescate, se paga como estancado.
-- ============================================================
create or replace function handle_new_validation()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_tree       trees%rowtype;
  v_threshold  integer;
  v_reward     integer;
  v_reward_ver integer;
  v_bonus      numeric;
  v_count      integer;
  v_radius     double precision;
  v_dist       double precision;
  v_stalled    boolean;
begin
  select * into v_tree from trees where id = new.tree_id for update;

  -- El registrante no puede validar su propio árbol.
  if v_tree.user_id = new.user_id then
    raise exception 'El registrante no puede validar su propio árbol';
  end if;

  -- Un árbol archivado como no verificable no vuelve por la puerta de atrás.
  if v_tree.status in ('unverifiable','rejected') then
    raise exception 'Este árbol está archivado y no admite verificaciones';
  end if;

  -- Geofence: la verificación es presencial por definición (13.2).
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
  v_bonus     := coalesce((select value::text::numeric from app_config where key = 'stalled_bonus_rate'), 1.5);

  -- Antes de contar esta verificación: el rescatador cobra por el estado en el
  -- que encontró el árbol.
  v_stalled    := tree_is_stalled(v_tree.status, v_tree.created_at, v_tree.validations_count);
  v_reward_ver := case when v_stalled then round(v_reward * v_bonus)::integer else v_reward end;

  update trees
    set validations_count = validations_count + 1, updated_at = now()
    where id = new.tree_id
    returning validations_count into v_count;

  -- Al alcanzar el umbral y si aún no está validado: validar + pagar a los participantes.
  if v_count >= v_threshold and v_tree.status in ('pending','stalled') then
    update trees set status = 'validated', updated_at = now() where id = new.tree_id;

    -- Registrante: recompensa base.
    update profiles set coins = coins + v_reward,
                        total_trees_validated = total_trees_validated + 1
      where id = v_tree.user_id;
    insert into wallet_transactions (user_id, amount, type, description, tree_id)
      values (v_tree.user_id, v_reward, 'earn', 'Árbol validado (registrante)', new.tree_id);

    -- Verificadores: con bono si el árbol venía estancado.
    update profiles p set coins = coins + v_reward_ver
      from tree_validations tv
      where tv.tree_id = new.tree_id and tv.user_id = p.id;
    insert into wallet_transactions (user_id, amount, type, description, tree_id)
      select tv.user_id, v_reward_ver, 'earn',
             case when v_stalled then 'Verificación validada (rescate de estancado)'
                  else 'Verificación validada' end,
             new.tree_id
        from tree_validations tv where tv.tree_id = new.tree_id;
  end if;

  return new;
end;
$$;

-- ============================================================
-- pilot_metrics — las preguntas que el MVP existe para responder (§16).
--
-- "¿Qué % de árboles no consigue 3 verificaciones?" no se podía contestar:
-- nada medía el tiempo en pendiente. Ahora sí.
-- ============================================================
create or replace view pilot_metrics as
  select
    count(*)::int                                                            as trees_total,
    count(*) filter (where status = 'validated')::int                        as validated,
    count(*) filter (where status = 'pending')::int                          as pending,
    count(*) filter (where tree_is_stalled(status, created_at, validations_count))::int as stalled,
    count(*) filter (where status = 'unverifiable')::int                     as unverifiable,
    round(100.0 * count(*) filter (where status = 'validated')
          / nullif(count(*), 0), 1)                                          as pct_validated,
    -- Cuánto tarda un árbol en juntar sus 3 verificaciones.
    round(avg(extract(epoch from updated_at - created_at) / 86400)
            filter (where status = 'validated')::numeric, 1)                 as avg_days_to_validate,
    round(avg(validations_count) filter (where status = 'pending')::numeric, 2) as avg_validations_pending
  from trees;

-- ============================================================
-- Grants
-- ============================================================
grant insert (tree_id, user_id, reason, notes) on tree_reports to authenticated;
grant select on tree_reports to authenticated;

grant execute on function tree_is_stalled(tree_status, timestamptz, integer) to authenticated;
grant execute on function is_stalled(trees) to authenticated;
grant execute on function verification_queue(double precision, double precision, integer) to authenticated;
grant execute on function report_tree_not_found(uuid, text) to authenticated;

-- Las métricas son del equipo, no del ciudadano: sólo service_role (admin).
grant select on pilot_metrics to service_role;
grant execute on all functions in schema public to service_role;
