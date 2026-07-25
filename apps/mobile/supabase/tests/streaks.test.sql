-- Rachas (0010): qué cuenta como día activo y cuándo la racha sigue viva.
--
-- La regla que más fácil se rompe al refactorizar es "termina hoy o AYER": si
-- alguien la cambia a "sólo hoy", la racha se le corta a todo el mundo cada
-- mañana hasta que actúe. Eso se prueba explícitamente acá.

begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

create temporary table ids (who text primary key, id uuid not null default gen_random_uuid());
insert into ids (who) values ('u');
insert into auth.users (id, email) select id, who || '@test.dev' from ids;
select set_config('request.jwt.claim.sub', (select id::text from ids where who='u'), true);

-- Helper: registra un árbol con fecha explícita, en hora de Bolivia.
-- El mediodía local evita que el caso quede pegado al borde del día.
create function seed_day(p_days_ago int) returns void language sql as $$
  insert into trees (user_id, latitude, longitude, dap, health, photo_url, created_at)
  select id, -17.3895, -66.1568, 20, 'good', 'x.jpg',
         (((now() at time zone 'America/La_Paz')::date - p_days_ago) + time '12:00')
           at time zone 'America/La_Paz'
  from ids where who = 'u';
$$;

-- ============================================================
-- Sin actividad
-- ============================================================
select is((select current_streak from my_streak()), 0, 'sin actividad la racha es 0');
select is((select best_streak    from my_streak()), 0, 'sin actividad el mejor histórico es 0');
select is((select active_today   from my_streak()), false, 'sin actividad, hoy no cuenta como activo');

-- ============================================================
-- Tres días consecutivos terminando hoy
-- ============================================================
select seed_day(2);
select seed_day(1);
select seed_day(0);

select is((select current_streak from my_streak()), 3, 'tres días seguidos dan racha de 3');
select is((select active_today   from my_streak()), true, 'con actividad de hoy, active_today es true');

-- Dos acciones el mismo día no valen dos días.
select seed_day(0);
select is((select current_streak from my_streak()), 3, 'dos acciones el mismo día cuentan como un solo día');

-- ============================================================
-- Verificar también cuenta como día activo (no sólo mapear)
-- ============================================================
create temporary table other (id uuid default gen_random_uuid());
insert into other default values;
insert into auth.users (id, email) select id, 'other@test.dev' from other;

with ins as (
  insert into trees (user_id, latitude, longitude, dap, health, photo_url)
  select id, -17.3895, -66.1568, 20, 'good', 'x.jpg' from other
  returning id
)
insert into tree_validations (tree_id, user_id, latitude, longitude, health, photo_url, created_at)
select ins.id, ids.id, -17.3895, -66.1568, 'good', 'v.jpg',
       (((now() at time zone 'America/La_Paz')::date - 3) + time '12:00')
         at time zone 'America/La_Paz'
from ins, ids where ids.who = 'u';

select is(
  (select current_streak from my_streak()), 4,
  'verificar también cuenta como día activo, no sólo mapear'
);

-- ============================================================
-- Racha viva vs rota
-- ============================================================
-- Se borra lo de hoy: la última actividad pasa a ser ayer.
delete from trees
where user_id = (select id from ids where who='u')
  and (created_at at time zone 'America/La_Paz')::date = (now() at time zone 'America/La_Paz')::date;

select is(
  (select current_streak from my_streak()), 3,
  'si la última actividad fue AYER la racha sigue viva (hay todo hoy para mantenerla)'
);

-- Se borra también lo de ayer: la última actividad queda más vieja que ayer.
delete from trees
where user_id = (select id from ids where who='u')
  and (created_at at time zone 'America/La_Paz')::date = (now() at time zone 'America/La_Paz')::date - 1;

select is(
  (select current_streak from my_streak()), 0,
  'si la última actividad es más vieja que ayer la racha está rota'
);

select * from finish();
rollback;
