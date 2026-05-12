
-- 1) Backfill de profiles.pueblo_id usando lower(email)
UPDATE public.profiles p
SET pueblo_id = r.pueblo_id
FROM public.registros r
WHERE p.pueblo_id IS NULL
  AND r.deleted_at IS NULL
  AND lower(r.email) = lower(p.email)
  AND r.pueblo_id IS NOT NULL;

-- 2) Arreglar handle_new_user para usar lower(email)
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pueblo_id uuid;
BEGIN
  SELECT pueblo_id INTO v_pueblo_id
  FROM public.registros
  WHERE lower(email) = lower(NEW.email)
    AND deleted_at IS NULL
    AND pueblo_id IS NOT NULL
  ORDER BY created_at DESC
  LIMIT 1;

  INSERT INTO public.profiles (id, email, pueblo_id)
  VALUES (NEW.id, NEW.email, v_pueblo_id);

  RETURN NEW;
END;
$function$;

-- 3) Trigger en registros para sincronizar profiles.pueblo_id por email
CREATE OR REPLACE FUNCTION public.sync_profile_pueblo_from_registro()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.email IS NULL OR NEW.pueblo_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.profiles
  SET pueblo_id = NEW.pueblo_id
  WHERE lower(email) = lower(NEW.email)
    AND (pueblo_id IS NULL OR pueblo_id <> NEW.pueblo_id);

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_profile_pueblo ON public.registros;
CREATE TRIGGER trg_sync_profile_pueblo
AFTER INSERT OR UPDATE OF email, pueblo_id ON public.registros
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_pueblo_from_registro();
