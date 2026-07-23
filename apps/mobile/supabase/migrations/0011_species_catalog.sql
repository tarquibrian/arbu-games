-- Catálogo de especies — datos de REFERENCIA, no de prueba.
--
-- Vivían en seed.sql, que sólo corre con `supabase db reset` (local). En un
-- proyecto Cloud el deploy es `supabase db push`, que NO corre seed.sql: sin
-- esta migración, producción arrancaría con CERO especies y se romperían el
-- form de registro (catálogo), la misión map_with_species (0009) y la ficha.
-- Mismo criterio que el catálogo de misiones (0009): lo que la app necesita en
-- producción va en una migración, no en seed.
--
-- Los comercios/cupones de seed.sql SÍ son de prueba (en producción se crean
-- desde el admin), así que se quedan allá.

-- common_name como clave natural: no tiene sentido tener dos "Jacarandá", y el
-- unique es lo que hace idempotente el insert de abajo (y cualquier re-seed).
alter table species add constraint species_common_name_key unique (common_name);

insert into species (common_name, scientific_name, default_remonitoring_days) values
  ('Jacarandá',    'Jacaranda mimosifolia',  180),
  ('Molle',        'Schinus molle',          180),
  ('Eucalipto',    'Eucalyptus globulus',    365),
  ('Ceibo',        'Erythrina crista-galli', 180),
  ('Álamo',        'Populus alba',           180),
  ('Sauce llorón', 'Salix babylonica',       180),
  ('Pino',         'Pinus radiata',          365),
  ('Palmera',      null,                     365),
  ('Desconocido',  null,                     null)
on conflict (common_name) do nothing;
