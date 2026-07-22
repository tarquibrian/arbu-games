-- Ranking real (13.6, capa hábito del MVP).
--
-- Alcance MVP: ranking semanal + histórico, SOLO estatus (sin premio en dinero;
-- el ranking global con premio es Fase 2, 13.6). Los puntos se calculan en el
-- servidor para que la tabla y el nivel del perfil no puedan divergir.
--
-- Nota sobre contadores: `profiles.total_trees_validated` cuenta "árboles MÍOS
-- que llegaron a validarse", no "verificaciones que hice" (lo incrementa el
-- trigger sólo para el registrante). Para ranking y perfil, las verificaciones
-- se cuentan de `tree_validations`, que es la fuente real.

-- ============================================================
-- Perilla de puntos (13.6). Distinta de earn_rate: los puntos son progreso
-- (nivel/ranking), las monedas son economía. Se ajustan por separado.
-- ============================================================
insert into app_config (key, value, description) values
  ('points_rate', '{"map": 10, "verify": 15}',
   'Puntos de la capa hábito por acción: mapear un árbol y verificar uno. No confundir con earn_rate (monedas).')
on conflict (key) do nothing;

-- ============================================================
-- leaderboard — tabla de posiciones por período.
-- p_period: 'week' (semana ISO en curso, hora de Bolivia) | 'all'.
-- Se excluye a quien no tiene actividad en el período: una tabla llena de ceros
-- no informa nada y esconde a los que sí participaron.
-- ============================================================
create or replace function leaderboard(p_period text default 'week', p_limit int default 50)
returns table (
  user_id          uuid,
  username         text,
  trees_mapped     integer,
  validations_done integer,
  points           integer,
  place            integer
)
language sql stable security invoker set search_path = public as $$
  with cfg as (
    select
      coalesce((value ->> 'map')::int, 10)    as p_map,
      coalesce((value ->> 'verify')::int, 15) as p_verify
    from app_config where key = 'points_rate'
  ),
  -- La semana arranca el lunes 00:00 hora de Cochabamba, no UTC: si no, el corte
  -- cae a las 20:00 del domingo local y el reinicio se ve a destiempo.
  win as (
    select case
      when p_period = 'week'
        then date_trunc('week', now() at time zone 'America/La_Paz') at time zone 'America/La_Paz'
      else '-infinity'::timestamptz
    end as since
  ),
  m as (
    select t.user_id, count(*)::int as c
    from trees t, win where t.created_at >= win.since group by t.user_id
  ),
  v as (
    select tv.user_id, count(*)::int as c
    from tree_validations tv, win where tv.created_at >= win.since group by tv.user_id
  ),
  scored as (
    select
      p.id, p.username,
      coalesce(m.c, 0) as mapped,
      coalesce(v.c, 0) as verified,
      (coalesce(m.c, 0) * cfg.p_map + coalesce(v.c, 0) * cfg.p_verify) as pts
    from profiles p
    cross join cfg
    left join m on m.user_id = p.id
    left join v on v.user_id = p.id
  )
  select
    s.id, s.username, s.mapped, s.verified, s.pts,
    (rank() over (order by s.pts desc))::int
  from scored s
  where s.pts > 0
  order by s.pts desc, s.username
  limit p_limit;
$$;

-- ============================================================
-- leaderboard_me — posición del usuario actual, aunque quede fuera del top.
-- Devuelve una fila siempre (con 0 puntos y posición null si no participó):
-- "no estás en la tabla" es información, y la pantalla la tiene que poder dar.
-- ============================================================
create or replace function leaderboard_me(p_period text default 'week')
returns table (
  username         text,
  trees_mapped     integer,
  validations_done integer,
  points           integer,
  place            integer,
  total_ranked     integer
)
language sql stable security invoker set search_path = public as $$
  with board as (select * from leaderboard(p_period, 100000)),
       me as (select * from board where user_id = auth.uid())
  select
    coalesce(me.username, (select p.username from profiles p where p.id = auth.uid())),
    coalesce(me.trees_mapped, 0),
    coalesce(me.validations_done, 0),
    coalesce(me.points, 0),
    me.place,
    (select count(*)::int from board)
  from (select 1) dummy
  left join me on true;
$$;

-- Arrastre de 0001: app_config tenía policy de SELECT pero nunca el GRANT de
-- tabla, así que el cliente jamás pudo leer las perillas (caía al default en
-- silencio) y leaderboard(), al ser security invoker, fallaba con 42501.
grant select on app_config to authenticated;

grant execute on function leaderboard(text, int)  to authenticated;
grant execute on function leaderboard_me(text)    to authenticated;
grant execute on all functions in schema public   to service_role;
