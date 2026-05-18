-- 1. Agregar valor al enum estado_registro
ALTER TYPE public.estado_registro ADD VALUE IF NOT EXISTS 'pendiente_validacion';

-- 2. Agregar columnas para rol Asesor
ALTER TABLE public.registros
  ADD COLUMN IF NOT EXISTS tipo_asesor text,
  ADD COLUMN IF NOT EXISTS pueblos_acompana uuid[];

-- 3. Constraint: tipo_asesor válido si presente
ALTER TABLE public.registros DROP CONSTRAINT IF EXISTS tipo_asesor_valido;
ALTER TABLE public.registros ADD CONSTRAINT tipo_asesor_valido
  CHECK (tipo_asesor IS NULL OR tipo_asesor IN ('padre_schoenstatt','diocesano','hermana_maria'));

-- 4. Actualizar check de rol para incluir 'Asesor'
ALTER TABLE public.registros DROP CONSTRAINT IF EXISTS registros_rol_check;
ALTER TABLE public.registros DROP CONSTRAINT IF EXISTS check_rol_valid;
ALTER TABLE public.registros ADD CONSTRAINT check_rol_valid
  CHECK (rol IN ('Tio','Misionero','Hijo','Asesor'));