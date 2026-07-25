-- Máquina de estados del registro (0012): estancado, rescate y estado terminal.
--
-- Lo que se protege acá es que el registrante honesto termine cobrando: si el
-- empujón a los pendientes olvidados deja de funcionar, el árbol se queda en
-- pending para siempre y nadie cobra nunca.

begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

create temporary table ids (who text primary key, id uuid not null default gen_random_uuid());
insert into ids (who) values ('owner'), ('v1'), ('v2'), ('v3'), ('other');
insert into auth.users (id, email) select id, who || '@test.dev' from ids;

-- Dos árboles del mismo dueño: uno recién registrado, otro de hace 30 días.
create temporary table t (who text primary key, id uuid not null default gen_random_uuid());
insert into t (who) values ('fresco'), ('viejo');
insert into trees (id, user_id, latitude, longitude, dap, health, photo_url, created_at)
select (select id from t where who='fresco'), id, -17.3895, -66.1568, 20, 'good', 'x.jpg', now()
from ids where who='owner';
insert into trees (id, user_id, latitude, longitude, dap, health, photo_url, created_at)
select (select id from t where who='viejo'), id, -17.3895, -66.1568, 20, 'good', 'x.jpg', now() - interval '30 days'
from ids where who='owner';

-- ============================================================
-- El estado computado
-- ============================================================
select ok(
  (select not tree_is_stalled(status, created_at, validations_count)
     from trees where id = (select id from t where who='fresco')),
  'un registro recién creado no está estancado'
);

select ok(
  (select tree_is_stalled(status, created_at, validations_count)
     from trees where id = (select id from t where who='viejo')),
  'un pendiente de 30 días sin completar el 1+3 está estancado'
);

-- ============================================================
-- La cola de verificación: a quién se le muestra qué
-- ============================================================
select set_config('request.jwt.claim.sub', (select id::text from ids where who='owner'), true);
select is(
  (select count(*)::int from verification_queue()),
  0,
  'la cola no le ofrece a nadie sus propios árboles'
);

select set_config('request.jwt.claim.sub', (select id::text from ids where who='v1'), true);
select is(
  (select count(*)::int from verification_queue()),
  2,
  'a un tercero le ofrece los dos pendientes'
);

select is(
  (select id from verification_queue() limit 1),
  (select id from t where who='viejo'),
  'los estancados van primero: son los que no se rescatan solos'
);

select is(
  (select reward_coins from verification_queue() where id = (select id from t where who='viejo')),
  45,
  'verificar un estancado paga con bono (30 x 1.5)'
);
select is(
  (select reward_coins from verification_queue() where id = (select id from t where who='fresco')),
  30,
  'un pendiente fresco paga la recompensa base'
);
select ok(
  (select days_waiting >= 29 from verification_queue() where id = (select id from t where who='viejo')),
  'la cola informa hace cuánto espera el registro'
);

-- Tras verificarlo, ese árbol sale de MI cola.
insert into tree_validations (tree_id, user_id, latitude, longitude, health, photo_url)
select (select id from t where who='viejo'), id, -17.3895, -66.1568, 'good', 'v.jpg'
from ids where who='v1';

select is(
  (select count(*)::int from verification_queue() where id = (select id from t where who='viejo')),
  0,
  'un árbol que ya verifiqué no vuelve a ofrecérseme'
);

-- ============================================================
-- Rescate: se completa el 1+3 sobre un estancado
-- ============================================================
insert into tree_validations (tree_id, user_id, latitude, longitude, health, photo_url)
select (select id from t where who='viejo'), id, -17.3895, -66.1568, 'good', 'v.jpg'
from ids where who='v2';
insert into tree_validations (tree_id, user_id, latitude, longitude, health, photo_url)
select (select id from t where who='viejo'), id, -17.3895, -66.1568, 'good', 'v.jpg'
from ids where who='v3';

select is(
  (select status::text from trees where id = (select id from t where who='viejo')),
  'validated',
  'un estancado rescatado por 3 verificadores queda validado'
);

select is(
  (select count(distinct id)::int from profiles
    where id in (select id from ids where who in ('v1','v2','v3')) and coins = 45),
  3,
  'los tres verificadores cobran el bono de rescate'
);

select is(
  (select coins from profiles where id = (select id from ids where who='owner')),
  30,
  'el registrante cobra la base: su problema era que nadie iba, no el monto'
);

select ok(
  (select count(*) = 3 from wallet_transactions
    where tree_id = (select id from t where who='viejo')
      and description like '%rescate%'),
  'las transacciones del rescate quedan identificadas como tales'
);

-- ============================================================
-- Estado terminal: nadie lo encuentra
-- ============================================================
select set_config('request.jwt.claim.sub', (select id::text from ids where who='owner'), true);
prepare reportar_propio as
  select report_tree_not_found((select id from t where who='fresco'));
select throws_like('reportar_propio', '%tu propio registro%',
  'reportar el propio árbol no es evidencia de nada');

select set_config('request.jwt.claim.sub', (select id::text from ids where who='v1'), true);
prepare reportar_validado as
  select report_tree_not_found((select id from t where who='viejo'));
select throws_like('reportar_validado', '%pendiente%',
  'un árbol ya validado no se reporta como no encontrado (eso es re-monitoreo)');

-- Un mismo usuario reportando dos veces no acumula evidencia.
select report_tree_not_found((select id from t where who='fresco'));
select is(
  (select reports from report_tree_not_found((select id from t where who='fresco'))),
  1,
  'el mismo usuario reportando dos veces cuenta como una sola persona'
);

-- Dos personas más: se alcanza el umbral.
select set_config('request.jwt.claim.sub', (select id::text from ids where who='v2'), true);
select report_tree_not_found((select id from t where who='fresco'));
select set_config('request.jwt.claim.sub', (select id::text from ids where who='v3'), true);
select ok(
  (select marked_unverifiable from report_tree_not_found((select id from t where who='fresco'))),
  'con 3 personas distintas que no lo encuentran, el árbol pasa a no verificable'
);

select is(
  (select status::text from trees where id = (select id from t where who='fresco')),
  'unverifiable',
  'el registro queda archivado, no borrado: es señal de fraude y sigue siendo dato'
);

prepare verificar_archivado as
  insert into tree_validations (tree_id, user_id, latitude, longitude, health, photo_url)
  select (select id from t where who='fresco'), id, -17.3895, -66.1568, 'good', 'v.jpg'
  from ids where who='other';
select throws_like('verificar_archivado', '%archivado%',
  'un árbol archivado no vuelve a la vida por una verificación nueva');

select * from finish();
rollback;
