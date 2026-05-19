
-- Trigger: cuando un registro pasa a cancelado o se borra (deleted_at), promover automáticamente al siguiente en lista de espera
CREATE OR REPLACE FUNCTION public.trg_promover_al_liberar_cupo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_libero_cupo boolean := false;
BEGIN
  -- DELETE físico: si era confirmado y ocupaba cupo
  IF TG_OP = 'DELETE' THEN
    IF OLD.estado = 'confirmado' AND OLD.deleted_at IS NULL
       AND public.ocupa_cupo(OLD.rol, OLD.nacimiento, OLD.año) THEN
      v_libero_cupo := true;
    END IF;
    IF v_libero_cupo THEN
      PERFORM public.promover_siguiente_en_lista(OLD.pueblo_id);
    END IF;
    RETURN OLD;
  END IF;

  -- UPDATE: pasó de confirmado activo a cancelado o soft-deleted
  IF TG_OP = 'UPDATE' THEN
    IF OLD.estado = 'confirmado' AND OLD.deleted_at IS NULL
       AND (NEW.estado = 'cancelado' OR NEW.deleted_at IS NOT NULL)
       AND public.ocupa_cupo(OLD.rol, OLD.nacimiento, OLD.año) THEN
      v_libero_cupo := true;
    END IF;
    IF v_libero_cupo THEN
      PERFORM public.promover_siguiente_en_lista(NEW.pueblo_id);
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS registros_promover_al_liberar ON public.registros;
CREATE TRIGGER registros_promover_al_liberar
AFTER UPDATE OR DELETE ON public.registros
FOR EACH ROW
EXECUTE FUNCTION public.trg_promover_al_liberar_cupo();

-- Promover ahora mismo a Itacurubí (y a cualquier otro pueblo con cupo libre y lista de espera)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.id
    FROM public.pueblos p
    WHERE p.activo = true
  LOOP
    -- Intentar promover hasta que no haya más cupo o no haya más en espera
    LOOP
      EXIT WHEN (public.promover_siguiente_en_lista(r.id)->>'promovido')::boolean IS DISTINCT FROM true;
    END LOOP;
  END LOOP;
END $$;
