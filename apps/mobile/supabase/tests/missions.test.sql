-- Misiones diarias (0009): progreso computado y anti doble-pago.
--
-- Lo que importa probar acá no es que pague, sino que NO pague de más: reclamar
-- sin haber completado, reclamar dos veces, o reclamar una misión que no salió
-- sorteada hoy. El progreso sale de las acciones reales, así que también se
-- verifica que mapear mueva el progreso sin que el cliente informe nada.

begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

create temporary table ids (who text primary key, id uuid not null default gen_random_uuid());
insert into ids (who) values ('u');
insert into auth.users (id, email) select id, who || '@test.dev' from ids;

-- Actuar como el usuario: los RPC leen auth.uid() de este setting.
select set_config('request.jwt.claim.sub', (select id::text from ids where who='u'), true);

-- ============================================================
-- Con el catálogo completo: forma de la selección diaria
-- ============================================================
select is(
  (select count(*)::int from daily_missions()),
  3,
  'se muestran 3 misiones por día (perilla daily_missions_count)'
);

select is(
  (select count(*)::int from (
     select mission_id from daily_missions()
     intersect
     select mission_id from daily_missions()
   ) s),
  3,
  'la selección del día es determinística: dos llamadas dan las mismas'
);

select is(
  (select count(*)::int from daily_missions() where progress > 0),
  0,
  'sin acciones, ninguna misión tiene progreso'
);

-- ============================================================
-- A partir de acá se acota el catálogo para que el sorteo por hash no vuelva
-- el test dependiente de la fecha: queda sólo map_one (1 árbol, 20 monedas).
-- ============================================================
update missions set active = false where code <> 'map_one';

select is(
  (select count(*)::int from daily_missions()),
  1,
  'sólo se sortean misiones activas'
);

select ok(
  (select not completed and not claimed from daily_missions()),
  'sin mapear nada, map_one no está completa ni reclamada'
);

-- ============================================================
-- Reclamos inválidos
-- ============================================================
prepare claim_incomplete as
  select claim_mission((select mission_id from daily_missions()));
select throws_like(
  'claim_incomplete', '%incompleta%',
  'reclamar una misión incompleta se rechaza'
);

select is(
  (select coins from profiles where id = (select id from ids where who='u')),
  0,
  'un reclamo rechazado no acredita monedas'
);

prepare claim_inactive as
  select claim_mission((select id from missions where code = 'verify_two'));
select throws_like(
  'claim_inactive', '%no está activa hoy%',
  'no se puede reclamar una misión que no salió sorteada hoy'
);

-- ============================================================
-- Completar de verdad y cobrar
-- ============================================================
insert into trees (user_id, latitude, longitude, dap, health, photo_url)
  select id, -17.3895, -66.1568, 20, 'good', 'x.jpg' from ids where who='u';

select ok(
  (select completed from daily_missions()),
  'mapear un árbol completa map_one sin que el cliente informe progreso'
);

select lives_ok(
  $$ select claim_mission((select mission_id from daily_missions())) $$,
  'reclamar una misión completa funciona'
);

select is(
  (select coins from profiles where id = (select id from ids where who='u')),
  20,
  'el saldo sube exactamente la recompensa de la misión'
);

prepare claim_twice as
  select claim_mission((select mission_id from daily_missions()));
select throws_like(
  'claim_twice', '%Ya reclamaste%',
  'reclamar dos veces el mismo día se rechaza (anti doble-pago)'
);

select * from finish();
rollback;
