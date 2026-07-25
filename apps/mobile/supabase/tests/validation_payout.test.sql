-- Loop 1+3: quién puede validar, y cuándo se paga (13.2).
--
-- Es la parte del sistema donde un bug cuesta plata real, así que lo que se
-- prueba acá son los casos ADVERSARIOS, no el camino feliz: validar tu propio
-- árbol, validar dos veces, validar desde otro barrio, y que el pago no se
-- dispare dos veces.

begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

-- ============================================================
-- Setup: 1 registrante + 4 verificadores, 1 árbol en una coordenada conocida.
-- ============================================================
create temporary table ids (who text primary key, id uuid not null default gen_random_uuid());
insert into ids (who) values ('owner'), ('v1'), ('v2'), ('v3'), ('v4');

insert into auth.users (id, email)
  select id, who || '@test.dev' from ids;

-- Árbol del registrante. Plaza Colón, Cochabamba.
create temporary table t (id uuid);
with ins as (
  insert into trees (user_id, latitude, longitude, dap, health, photo_url)
  values ((select id from ids where who='owner'), -17.3895, -66.1568, 20, 'good', 'x.jpg')
  returning id
)
insert into t select id from ins;

select is(
  (select status::text from trees where id = (select id from t)),
  'pending',
  'un árbol recién registrado arranca pendiente'
);

select is(
  (select coins from profiles where id = (select id from ids where who='owner')),
  0,
  'registrar no paga: el pago es sólo al validarse (13.2)'
);

-- ============================================================
-- Reglas de quién puede validar
-- ============================================================
prepare own_validation as
  insert into tree_validations (tree_id, user_id, latitude, longitude, health, photo_url)
  values ((select id from t), (select id from ids where who='owner'), -17.3895, -66.1568, 'good', 'v.jpg');
select throws_ok(
  'own_validation', null,
  'El registrante no puede validar su propio árbol',
  'el registrante no puede validar su propio árbol'
);

prepare no_coords as
  insert into tree_validations (tree_id, user_id, health, photo_url)
  values ((select id from t), (select id from ids where who='v1'), 'good', 'v.jpg');
select throws_ok(
  'no_coords', null,
  'Falta tu ubicación: la verificación tiene que hacerse en el lugar',
  'sin coordenadas no se puede verificar'
);

-- ~1.1 km al norte: fuera del radio de 30 m.
prepare too_far as
  insert into tree_validations (tree_id, user_id, latitude, longitude, health, photo_url)
  values ((select id from t), (select id from ids where who='v1'), -17.3795, -66.1568, 'good', 'v.jpg');
select throws_like(
  'too_far', '%máximo%',
  'verificar lejos del árbol se rechaza (geofence server-side)'
);

-- ============================================================
-- Primera verificación válida: cuenta, pero NO paga todavía
-- ============================================================
insert into tree_validations (tree_id, user_id, latitude, longitude, health, photo_url)
values ((select id from t), (select id from ids where who='v1'), -17.3895, -66.1568, 'good', 'v.jpg');

select is(
  (select validations_count from trees where id = (select id from t)),
  1,
  'la primera verificación incrementa el contador'
);
select is(
  (select status::text from trees where id = (select id from t)),
  'pending',
  'con 1 de 3 el árbol sigue pendiente'
);
select is(
  (select coins from profiles where id = (select id from ids where who='v1')),
  0,
  'el verificador no cobra antes de que se complete el 1+3'
);

-- El mismo usuario no puede sumar dos veces (si no, uno solo cierra el 1+3).
prepare duplicate_validation as
  insert into tree_validations (tree_id, user_id, latitude, longitude, health, photo_url)
  values ((select id from t), (select id from ids where who='v1'), -17.3895, -66.1568, 'good', 'v.jpg');
select throws_ok(
  'duplicate_validation', '23505',
  null,
  'el mismo usuario no puede verificar dos veces el mismo árbol'
);

-- ============================================================
-- Se completa el 1+3: valida y paga a los cuatro
-- ============================================================
insert into tree_validations (tree_id, user_id, latitude, longitude, health, photo_url)
values ((select id from t), (select id from ids where who='v2'), -17.3895, -66.1568, 'good', 'v.jpg');
insert into tree_validations (tree_id, user_id, latitude, longitude, health, photo_url)
values ((select id from t), (select id from ids where who='v3'), -17.3895, -66.1568, 'good', 'v.jpg');

select is(
  (select status::text from trees where id = (select id from t)),
  'validated',
  'con la tercera verificación el árbol queda validado'
);

select is(
  (select coins from profiles where id = (select id from ids where who='owner')),
  30,
  'el registrante cobra al validarse el árbol'
);
select is(
  (select count(distinct id)::int from profiles
    where id in (select id from ids where who in ('v1','v2','v3')) and coins = 30),
  3,
  'los tres verificadores cobran, incluido el que llegó primero'
);
select is(
  (select total_trees_validated from profiles where id = (select id from ids where who='owner')),
  1,
  'total_trees_validated cuenta árboles PROPIOS validados, no verificaciones hechas'
);
select is(
  (select count(*)::int from wallet_transactions where tree_id = (select id from t)),
  4,
  'queda una transacción por participante'
);

-- ============================================================
-- El pago no se repite
-- ============================================================
insert into tree_validations (tree_id, user_id, latitude, longitude, health, photo_url)
values ((select id from t), (select id from ids where who='v4'), -17.3895, -66.1568, 'good', 'v.jpg');

select is(
  (select coins from profiles where id = (select id from ids where who='owner')),
  30,
  'una cuarta verificación no vuelve a pagar al registrante'
);
select is(
  (select count(*)::int from wallet_transactions where tree_id = (select id from t)),
  4,
  'una cuarta verificación no genera transacciones nuevas'
);

select * from finish();
rollback;
