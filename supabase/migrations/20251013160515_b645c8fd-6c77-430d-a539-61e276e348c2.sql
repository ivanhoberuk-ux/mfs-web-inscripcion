-- Agregar índice único para el campo CI en la tabla registros
-- Esto previene duplicados a nivel de base de datos
CREATE UNIQUE INDEX IF NOT EXISTS registros_ci_unique_idx ON public.registros(ci);