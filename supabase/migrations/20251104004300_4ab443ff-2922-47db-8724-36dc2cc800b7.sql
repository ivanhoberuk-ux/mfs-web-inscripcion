-- Agregar campo ciudad a la tabla registros
ALTER TABLE public.registros 
ADD COLUMN IF NOT EXISTS ciudad text;