-- GPS real: geofence de verificación + detección de duplicados (13.1, 13.2).
--
-- Por qué server-side: el modelo 1+3 sólo vale si los 3 verificadores estuvieron
-- realmente frente al árbol. Un chequeo de distancia en el cliente es cosmético
-- (cualquiera puede mandar el insert a mano), así que el trigger es el que manda:
-- sin coordenadas, o lejos del árbol, la verificación no entra.

-- ============================================================
-- Perillas nuevas
-- ============================================================
insert into app_config (key, value, description) values
  ('verify_radius_m',    '30', 'Distancia máxima (m) entre el verificador y el árbol para aceptar una verificación (13.2). En local subilo para probar con Invitado A/B: el simulador miente la ubicación.'),
  ('gps_accuracy_max_m', '15', 'Precisión GPS aceptable al registrar (13.1). Por encima se advierte y se pide ajustar el pin a mano; no bloquea.')
on conflict (key) do nothing;

-- ============================================================
-- distance_m — haversine en metros. Suficiente a escala urbana;
-- si algún día entra PostGIS, esto se reemplaza por geography <->.
-- ============================================================
create or replace function distance_m(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
) returns double precision
language sql immutable parallel safe as $$
  select 2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) *
    power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

-- ============================================================
-- tree_validations.gps_accuracy — precisión reportada por el device.
-- Se guarda para poder auditar después qué tan confiable era el fix.
-- ============================================================
alter table tree_validations add column if not exists gps_accuracy real;

grant insert (gps_accuracy) on tree_validations to authenticated;

-- ============================================================
-- handle_new_validation — reemplaza la versión de 0001.
-- Igual que antes (contar, validar al 3ro, repartir) + geofence al inicio.
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

  -- El registrante no puede validar su propio árbol.
  if v_tree.user_id = new.user_id then
    raise exception 'El registrante no puede validar su propio árbol';
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

-- ============================================================
-- nearby_trees — duplicados al registrar (13.1): "¿es uno de estos?"
-- Devuelve los árboles conocidos dentro del radio, más cercano primero.
-- El prefiltro por bounding box existe para que entre el índice (lat,lng);
-- el haversine después afina.
-- ============================================================
create or replace function nearby_trees(
  p_lat      double precision,
  p_lng      double precision,
  p_radius_m double precision default null
) returns table (
  id                uuid,
  latitude          double precision,
  longitude         double precision,
  photo_url         text,
  species_name      text,
  status            tree_status,
  validations_count integer,
  dap               real,
  health            tree_health,
  created_at        timestamptz,
  distance_meters   double precision
)
language sql stable security invoker set search_path = public as $$
  with r as (
    select coalesce(
      p_radius_m,
      (select value::text::numeric from app_config where key = 'duplicate_radius_m'),
      25
    )::double precision as radius
  )
  select t.id, t.latitude, t.longitude, t.photo_url, t.species_name, t.status,
         t.validations_count, t.dap, t.health, t.created_at,
         distance_m(t.latitude, t.longitude, p_lat, p_lng)
  from trees t, r
  where t.status in ('pending','stalled','validated')
    and t.latitude  between p_lat - (r.radius / 111320.0)
                        and p_lat + (r.radius / 111320.0)
    and t.longitude between p_lng - (r.radius / (111320.0 * greatest(cos(radians(p_lat)), 0.01)))
                        and p_lng + (r.radius / (111320.0 * greatest(cos(radians(p_lat)), 0.01)))
    and distance_m(t.latitude, t.longitude, p_lat, p_lng) <= r.radius
  order by 11 asc
  limit 10;
$$;

grant execute on function distance_m(double precision, double precision, double precision, double precision) to authenticated;
grant execute on function nearby_trees(double precision, double precision, double precision) to authenticated;
grant execute on all functions in schema public to service_role;
