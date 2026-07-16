-- Seed de desarrollo — se aplica con `supabase db reset`.
-- Catálogo mínimo de especies urbanas de Cochabamba + comercios/cupones de prueba.

insert into species (common_name, scientific_name, default_remonitoring_days) values
  ('Jacarandá',        'Jacaranda mimosifolia',   180),
  ('Molle',            'Schinus molle',           180),
  ('Eucalipto',        'Eucalyptus globulus',     365),
  ('Ceibo',            'Erythrina crista-galli',  180),
  ('Álamo',            'Populus alba',            180),
  ('Sauce llorón',     'Salix babylonica',        180),
  ('Pino',             'Pinus radiata',           365),
  ('Palmera',          null,                      365),
  ('Desconocido',      null,                      null);

-- ============================================================
-- Comercios + cupones de prueba (MVP piloto Cochabamba: canje on_site).
-- category del cupón alinea con los filtros de rewards.tsx.
-- ============================================================
with
  m_cafe as (
    insert into merchants (name, category, address, latitude, longitude)
    values ('Café Verde', 'Cafetería', 'Av. Ballivián, Cochabamba', -17.3895, -66.1568) returning id
  ),
  m_bici as (
    insert into merchants (name, category, address, latitude, longitude)
    values ('BiciCochala', 'Deportes', 'Ciclovía Río Rocha, Cochabamba', -17.3820, -66.1590) returning id
  ),
  m_vivero as (
    insert into merchants (name, category, address, latitude, longitude)
    values ('Vivero El Bosque', 'Plantas', 'Av. América, Cochabamba', -17.3760, -66.1620) returning id
  ),
  m_cine as (
    insert into merchants (name, category, address, latitude, longitude)
    values ('CineEco', 'Entretenimiento', 'Cala Cala, Cochabamba', -17.3705, -66.1490) returning id
  ),
  m_deli as (
    insert into merchants (name, category, address, latitude, longitude)
    values ('DeliGreen', 'Cafetería', 'Av. Pando, Cochabamba', -17.3930, -66.1545) returning id
  )
insert into coupons
  (merchant_id, title, description, category, benefit_type, price_coins, tier, redemption_location, quota, quota_remaining, use_window_days)
values
  ((select id from m_cafe),   '1 Café Express gratis',        'Canjea un café espresso mediano en cualquiera de nuestras sucursales.', 'Cafeterías',      'product',  150, 'short',  'on_site', 50, 50, 30),
  ((select id from m_deli),   'Descuento 15% en Combo',       'Descuento aplicable a combos de desayuno saludable o almuerzo verde.',  'Cafeterías',      'discount', 180, 'short',  'on_site', 100, 100, 30),
  ((select id from m_bici),   '1 hora de alquiler gratis',    'Una hora gratis de bicicleta de montaña para pasear por la ciclovía.',  'Deportes',        'product',  200, 'medium', 'on_site', 30, 30, 15),
  ((select id from m_vivero), '20% Descuento en Suculentas',  'Descuento del 20% aplicable a cualquier suculenta o maceta pequeña.',   'Plantas',         'discount', 300, 'medium', 'on_site', 40, 40, 45),
  ((select id from m_cine),   '1 entrada 2x1 al Cine',        'Entrada 2x1 en funciones de lunes a miércoles.',                       'Entretenimiento', 'ticket',   350, 'long',   'on_site', 60, 60, 60);
