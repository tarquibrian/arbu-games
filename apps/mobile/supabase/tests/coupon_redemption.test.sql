-- Canje de cupones (0001/0004): el lado de GASTAR monedas.
--
-- Dos superficies distintas y ambas caras si fallan:
--   1. redeem_coupon() — que nadie gaste monedas que no tiene ni pase el cupo.
--   2. validate_redemption() — que un código no se honre dos veces, y que un
--      comercio no pueda validar cupones de otro.

begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

create temporary table ids (who text primary key, id uuid not null default gen_random_uuid());
insert into ids (who) values ('user'), ('comercio_a'), ('comercio_b');
insert into auth.users (id, email) select id, who || '@test.dev' from ids;

-- Dos comercios, cada uno con su cuenta y su cupón.
create temporary table m (who text primary key, id uuid not null default gen_random_uuid());
insert into m (who) values ('a'), ('b');
insert into merchants (id, name, category)
  select id, 'Comercio ' || upper(who), 'Cafetería' from m;
insert into merchant_members (merchant_id, user_id)
  select (select id from m where who='a'), (select id from ids where who='comercio_a');
insert into merchant_members (merchant_id, user_id)
  select (select id from m where who='b'), (select id from ids where who='comercio_b');

create temporary table c (who text primary key, id uuid not null default gen_random_uuid());
insert into c (who) values ('normal'), ('agotado'), ('inactivo');
insert into coupons (id, merchant_id, title, benefit_type, price_coins, quota, quota_remaining, use_window_days, active)
values
  ((select id from c where who='normal'),   (select id from m where who='a'), 'Café gratis',  'product', 100, 10, 10, 30, true),
  ((select id from c where who='agotado'),  (select id from m where who='a'), 'Agotado',      'product',  50,  5,  0, 30, true),
  ((select id from c where who='inactivo'), (select id from m where who='a'), 'Inactivo',     'product',  50,  5,  5, 30, false);

select set_config('request.jwt.claim.sub', (select id::text from ids where who='user'), true);

-- ============================================================
-- redeem_coupon: rechazos
-- ============================================================
prepare sin_saldo as select redeem_coupon((select id from c where who='normal'));
select throws_like('sin_saldo', '%Saldo insuficiente%',
  'no se puede canjear sin monedas suficientes');

select is(
  (select count(*)::int from coupon_redemptions),
  0,
  'un canje rechazado no crea redención'
);

-- Se le acreditan 250 monedas.
update profiles set coins = 250 where id = (select id from ids where who='user');

prepare agotado as select redeem_coupon((select id from c where who='agotado'));
select throws_like('agotado', '%agotado%',
  'un cupón sin cupo restante se rechaza');

prepare inactivo as select redeem_coupon((select id from c where who='inactivo'));
select throws_like('inactivo', '%no disponible%',
  'un cupón inactivo se rechaza');

select is(
  (select coins from profiles where id = (select id from ids where who='user')),
  250,
  'ningún rechazo descontó monedas'
);

-- ============================================================
-- redeem_coupon: camino válido
-- ============================================================
select lives_ok(
  $$ select redeem_coupon((select id from c where who='normal')) $$,
  'con saldo y cupo, el canje funciona'
);

select is(
  (select coins from profiles where id = (select id from ids where who='user')),
  150,
  'se descuenta exactamente el precio del cupón (250 - 100)'
);

select is(
  (select quota_remaining from coupons where id = (select id from c where who='normal')),
  9,
  'el cupo del cupón baja en uno'
);

select is(
  (select status::text from coupon_redemptions limit 1),
  'claimed',
  'la redención nace CLAIMED: el comercio es quien la pasa a used al validar'
);

select ok(
  (select redemption_code ~ '^ARBU-[0-9A-F]{8}$' from coupon_redemptions limit 1),
  'se genera un código con el formato esperado'
);

-- ============================================================
-- validate_redemption: anti-suplantación entre comercios
-- ============================================================
create temporary table code as select redemption_code as v from coupon_redemptions limit 1;

select set_config('request.jwt.claim.sub', (select id::text from ids where who='comercio_b'), true);
prepare comercio_ajeno as select validate_redemption((select v from code));
select throws_like('comercio_ajeno', '%no pertenece a tu comercio%',
  'un comercio no puede validar el cupón de otro comercio');

select is(
  (select status::text from coupon_redemptions limit 1),
  'claimed',
  'el intento del comercio ajeno no cambió el estado de la redención'
);

-- ============================================================
-- validate_redemption: el comercio dueño, y un solo uso
-- ============================================================
select set_config('request.jwt.claim.sub', (select id::text from ids where who='comercio_a'), true);

select lives_ok(
  $$ select validate_redemption((select v from code)) $$,
  'el comercio dueño valida el código'
);

select is(
  (select status::text from coupon_redemptions limit 1),
  'used',
  'validar deja la redención como usada'
);

prepare segunda_vez as select validate_redemption((select v from code));
select throws_like('segunda_vez', '%ya usado%',
  'el mismo código no se puede honrar dos veces (single-use)');

prepare codigo_falso as select validate_redemption('ARBU-DEADBEEF');
select throws_like('codigo_falso', '%inválido%',
  'un código inexistente se rechaza');

select * from finish();
rollback;
