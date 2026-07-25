-- Actividad del comercio (0013).
--
-- Dos propiedades que importan más que los números: que un comercio vea SÓLO lo
-- suyo, y que la identidad del ciudadano no salga nunca. Un panel que filtre mal
-- le muestra a un comercio la actividad de su competencia.

begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

create temporary table ids (who text primary key, id uuid not null default gen_random_uuid());
insert into ids (who) values ('cliente'), ('comercio_a'), ('comercio_b');
insert into auth.users (id, email) select id, who || '@test.dev' from ids;

create temporary table m (who text primary key, id uuid not null default gen_random_uuid());
insert into m (who) values ('a'), ('b');
insert into merchants (id, name, category) select id, 'Comercio ' || upper(who), 'Cafetería' from m;
insert into merchant_members (merchant_id, user_id)
  select (select id from m where who='a'), (select id from ids where who='comercio_a');
insert into merchant_members (merchant_id, user_id)
  select (select id from m where who='b'), (select id from ids where who='comercio_b');

-- A tiene dos cupones, B uno.
create temporary table c (who text primary key, id uuid not null default gen_random_uuid());
insert into c (who) values ('a_popular'), ('a_flojo'), ('b_solo');
insert into coupons (id, merchant_id, title, benefit_type, price_coins, quota, quota_remaining, use_window_days, active)
values
  ((select id from c where who='a_popular'), (select id from m where who='a'), 'Café gratis',   'product', 100, 10, 10, 30, true),
  ((select id from c where who='a_flojo'),   (select id from m where who='a'), 'Medialuna',     'product',  80, 10, 10, 30, true),
  ((select id from c where who='b_solo'),    (select id from m where who='b'), 'Cupón de B',    'product',  50, 10, 10, 30, true);

-- El cliente canjea: 2 del popular de A, 1 del flojo de A, 1 de B.
update profiles set coins = 1000 where id = (select id from ids where who='cliente');
select set_config('request.jwt.claim.sub', (select id::text from ids where who='cliente'), true);
select redeem_coupon((select id from c where who='a_popular'));
select redeem_coupon((select id from c where who='a_flojo'));
select redeem_coupon((select id from c where who='b_solo'));

-- Comercio A valida uno de los suyos (queda 'used'); el resto sigue 'claimed'.
create temporary table code as
  select r.redemption_code as v from coupon_redemptions r
  where r.coupon_id = (select id from c where who='a_popular') limit 1;
select set_config('request.jwt.claim.sub', (select id::text from ids where who='comercio_a'), true);
select validate_redemption((select v from code));

-- ============================================================
-- Resumen de A
-- ============================================================
select is((select claimed_total from merchant_activity()), 2, 'A ve los 2 canjes de SUS cupones');
select is((select used_total    from merchant_activity()), 1, 'A ve 1 canje ya usado');
select is((select pending_use   from merchant_activity()), 1, 'A ve 1 reclamado pendiente de usar (visita esperable)');
select is((select coins_total   from merchant_activity()), 100, 'las monedas captadas cuentan sólo lo usado, no lo reclamado');
select is((select coupons_active from merchant_activity()), 2, 'A ve sus 2 cupones activos');
select is((select used_last_7d  from merchant_activity()), 1, 'el uso reciente entra en la ventana de 7 días');

-- ============================================================
-- Aislamiento: A no ve nada de B
-- ============================================================
select is(
  (select count(*)::int from merchant_coupon_stats()),
  2,
  'el detalle por cupón muestra sólo los cupones propios'
);
select is(
  (select count(*)::int from merchant_coupon_stats() where title = 'Cupón de B'),
  0,
  'el cupón de la competencia no aparece'
);
select is(
  (select title from merchant_coupon_stats() limit 1),
  'Café gratis',
  'ordena por canjes: el cupón que más se movió va primero'
);
select is(
  (select count(*)::int from merchant_recent_redemptions()),
  2,
  'el listado reciente trae sólo canjes propios'
);

-- ============================================================
-- Privacidad: la identidad del ciudadano no se expone
-- ============================================================
-- Se inspecciona la FIRMA de la función: si alguien agrega user_id (o cualquier
-- dato del ciudadano) al returns table, este test lo caza. Mirar los datos
-- devueltos no serviría: la ausencia de una columna no se nota al leer filas.
select ok(
  (select pg_get_function_result(p.oid) !~* '(user_id|email|username)'
     from pg_proc p where p.proname = 'merchant_recent_redemptions'),
  'la firma de merchant_recent_redemptions no expone identidad del ciudadano'
);
select ok(
  (select bool_and(pg_get_function_result(p.oid) !~* '(user_id|email|username)')
     from pg_proc p
     where p.proname in ('merchant_activity','merchant_coupon_stats','merchant_recent_redemptions')),
  'ninguna función del panel del comercio expone identidad del ciudadano'
);

-- ============================================================
-- B ve lo suyo, y sólo lo suyo
-- ============================================================
select set_config('request.jwt.claim.sub', (select id::text from ids where who='comercio_b'), true);
select is((select claimed_total from merchant_activity()), 1, 'B ve únicamente su propio canje');

select * from finish();
rollback;
