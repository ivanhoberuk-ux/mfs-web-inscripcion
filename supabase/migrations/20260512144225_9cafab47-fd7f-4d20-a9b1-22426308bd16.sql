ALTER TABLE public.registros DROP CONSTRAINT rama_schoenstatt_valida;
ALTER TABLE public.registros ADD CONSTRAINT rama_schoenstatt_valida CHECK (
  rama_schoenstatt IS NULL OR rama_schoenstatt = ANY (ARRAY[
    'Juventud Masculina','Juventud Femenina','Colaboradores',
    'Liga Apostólica','Federación Apostólica','Instituto Secular',
    'Pioneros','Apóstoles'
  ])
);