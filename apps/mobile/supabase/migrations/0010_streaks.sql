-- Rachas / streaks (13.6, capa hábito del MVP).
--
-- Mismo principio que misiones (0009): la racha NO se guarda en un contador.
-- Se computa de las acciones que ya existen (trees.created_at,
-- tree_validations.created_at). Un `current_streak` escribible es superficie de
-- fraude y se desincroniza del dato real; acá no hay nada que falsear porque el
-- número sale de las mismas filas que ya se auditan.
--
-- Definición de "día activo": el usuario mapeó o verificó al menos un árbol ese
-- día (hora de Cochabamba — el corte a UTC movería el día y rompería rachas de
-- gente que actúa de noche).
--
-- Semántica de la racha (estándar de apps de hábito):
--   - La racha es el tramo de días consecutivos que TERMINA hoy o ayer.
--   - Si la última actividad fue ayer, la racha sigue VIVA: tenés todo hoy para
--     mantenerla. Por eso el corte es "hoy o ayer", no sólo "hoy".
--   - Si la última actividad es más vieja que ayer, la racha está rota → 0.
--     No se persiste un reset: al no haber días recientes, el tramo no califica.

-- ============================================================
-- my_streak — racha actual, mejor histórica y si ya hay actividad hoy.
-- Devuelve siempre una fila (ceros si el usuario nunca actuó).
-- ============================================================
create or replace function my_streak()
returns table (
  current_streak integer,
  best_streak    integer,
  active_today   boolean
)
language sql stable security invoker set search_path = public as $$
  with me as (select auth.uid() as uid),
       today as (select (now() at time zone 'America/La_Paz')::date as td),
       -- Días con actividad, unificando mapeos y verificaciones. distinct porque
       -- dos acciones el mismo día son un solo día de racha.
       days as (
         select distinct (a.created_at at time zone 'America/La_Paz')::date as d
         from (
           select user_id, created_at from trees
           union all
           select user_id, created_at from tree_validations
         ) a, me
         where a.user_id = me.uid
       ),
       -- Gaps-and-islands: días consecutivos comparten (d - fila), así que agrupar
       -- por esa resta separa cada tramo continuo.
       grp as (
         select d, d - (row_number() over (order by d))::int as island
         from days
       ),
       runs as (
         select max(d) as end_d, count(*)::int as len
         from grp group by island
       )
  select
    -- Racha actual: el tramo cuyo último día es hoy o ayer. Si no hay ninguno,
    -- la racha está rota → 0.
    coalesce((
      select r.len from runs r, today t
      where r.end_d >= t.td - 1
      order by r.end_d desc limit 1
    ), 0),
    coalesce((select max(len) from runs), 0),
    exists (select 1 from days d, today t where d.d = t.td);
$$;

grant execute on function my_streak() to authenticated;
grant execute on all functions in schema public to service_role;
