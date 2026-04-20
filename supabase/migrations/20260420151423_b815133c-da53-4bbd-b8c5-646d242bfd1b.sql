-- Actualizar función ocupa_cupo: usar edad exacta al 1 de enero del año de misión, límite < 12
CREATE OR REPLACE FUNCTION public.ocupa_cupo(p_rol text, p_nacimiento date, p_año integer)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_ref_date date;
  v_edad int;
BEGIN
  -- Si no es Hijo, siempre ocupa cupo
  IF p_rol IS DISTINCT FROM 'Hijo' THEN
    RETURN true;
  END IF;

  -- Fecha de referencia: 1 de enero del año de la misión
  v_ref_date := make_date(p_año, 1, 1);

  -- Edad exacta cumplida a esa fecha (years entre nacimiento y referencia)
  v_edad := date_part('year', age(v_ref_date, p_nacimiento))::int;

  -- Menor de 12 años cumplidos => NO ocupa cupo
  IF v_edad < 12 THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;