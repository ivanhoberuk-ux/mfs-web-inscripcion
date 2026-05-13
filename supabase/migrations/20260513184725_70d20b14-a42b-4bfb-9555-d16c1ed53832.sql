ALTER TABLE public.registros DROP CONSTRAINT IF EXISTS rama_schoenstatt_valida;
ALTER TABLE public.registros ADD CONSTRAINT rama_schoenstatt_valida CHECK (
  rama_schoenstatt IS NULL OR rama_schoenstatt = ANY (ARRAY[
    'Pioneros'::text,
    'Apóstoles de María'::text,
    'Juventud Masculina'::text,
    'Juventud Femenina'::text,
    'Discernimiento'::text,
    'Colaboradores'::text,
    'Liga Apostólica'::text,
    'Federación Apostólica'::text,
    'Instituto Secular'::text,
    'Apóstoles'::text
  ])
);