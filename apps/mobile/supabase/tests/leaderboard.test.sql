-- Ranking (0008): puntos desde la perilla, y quién entra en la tabla.
--
-- El punto delicado es que perfil y ranking no puedan divergir: getMyStats()
-- toma los puntos de leaderboard_me(), así que si la fórmula cambia en un solo
-- lugar los números se contradicen en pantalla.

begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

create temporary table ids (who text primary key, id uuid not null default gen_random_uuid());
insert into ids (who) values ('mapper'), ('verifier'), ('idle'), ('owner');
insert into auth.users (id, email) select id, who || '@test.dev' from ids;

-- mapper: 2 árboles = 2 * 10 pts
insert into trees (user_id, latitude, longitude, dap, health, photo_url)
select id, -17.3895, -66.1568, 20, 'good', 'x.jpg' from ids where who='mapper';
insert into trees (user_id, latitude, longitude, dap, health, photo_url)
select id, -17.3895, -66.1568, 20, 'good', 'x.jpg' from ids where who='mapper';

-- verifier: 1 verificación = 15 pts (sobre un árbol ajeno)
with ins as (
  insert into trees (user_id, latitude, longitude, dap, health, photo_url)
  select id, -17.3895, -66.1568, 20, 'good', 'x.jpg' from ids where who='owner'
  returning id
)
insert into tree_validations (tree_id, user_id, latitude, longitude, health, photo_url)
select ins.id, ids.id, -17.3895, -66.1568, 'good', 'v.jpg'
from ins, ids where ids.who = 'verifier';

-- ============================================================
-- Puntos según app_config.points_rate {map:10, verify:15}
-- ============================================================
select is(
  (select points from leaderboard('all', 100) where user_id = (select id from ids where who='mapper')),
  20,
  'mapear 2 árboles da 20 puntos (2 x map:10)'
);

select is(
  (select points from leaderboard('all', 100) where user_id = (select id from ids where who='verifier')),
  15,
  'verificar 1 árbol da 15 puntos (verify:15)'
);

select is(
  (select validations_done from leaderboard('all', 100) where user_id = (select id from ids where who='verifier')),
  1,
  'las verificaciones se cuentan de tree_validations, no del contador del perfil'
);

-- ============================================================
-- Quién aparece en la tabla
-- ============================================================
select is(
  (select count(*)::int from leaderboard('all', 100) where user_id = (select id from ids where who='idle')),
  0,
  'quien no participó no ocupa lugar en la tabla'
);

select is(
  (select place from leaderboard('all', 100) where user_id = (select id from ids where who='mapper')),
  1,
  'ordena por puntos: el de 20 va antes que el de 15'
);

-- ============================================================
-- leaderboard_me devuelve fila SIEMPRE — "no estás en la tabla" es información
-- que la pantalla tiene que poder mostrar.
-- ============================================================
select set_config('request.jwt.claim.sub', (select id::text from ids where who='idle'), true);

select is(
  (select count(*)::int from leaderboard_me('all')),
  1,
  'leaderboard_me devuelve una fila aunque el usuario no haya participado'
);
select is(
  (select points from leaderboard_me('all')),
  0,
  'sin participar, los puntos propios son 0'
);
select ok(
  (select place is null from leaderboard_me('all')),
  'sin participar no hay puesto (null), que es distinto de "último"'
);

select * from finish();
rollback;
