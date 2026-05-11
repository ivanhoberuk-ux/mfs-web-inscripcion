ALTER TABLE public.registros DROP CONSTRAINT check_rol_valid;
ALTER TABLE public.registros ADD CONSTRAINT check_rol_valid CHECK (rol IN ('Tio','Misionero','Hijo'));