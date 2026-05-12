create or replace function public.update_registro_documentos(
  p_registro_id uuid,
  p_autorizacion_url text default null,
  p_ficha_medica_url text default null,
  p_firma_url text default null,
  p_cedula_frente_url text default null,
  p_cedula_dorso_url text default null
)
returns public.registros
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_email text;
  v_registro public.registros;
begin
  v_user_email := lower(coalesce((auth.jwt() ->> 'email'), ''));

  update public.registros r
  set
    autorizacion_url = case when p_autorizacion_url is null then r.autorizacion_url else p_autorizacion_url end,
    ficha_medica_url = case when p_ficha_medica_url is null then r.ficha_medica_url else p_ficha_medica_url end,
    firma_url = case when p_firma_url is null then r.firma_url else p_firma_url end,
    cedula_frente_url = case when p_cedula_frente_url is null then r.cedula_frente_url else p_cedula_frente_url end,
    cedula_dorso_url = case when p_cedula_dorso_url is null then r.cedula_dorso_url else p_cedula_dorso_url end
  where r.id = p_registro_id
    and r.deleted_at is null
    and (
      is_super_admin()
      or (is_pueblo_admin() and r.pueblo_id = get_user_pueblo_id())
      or lower(r.email) = v_user_email
    )
  returning * into v_registro;

  if v_registro.id is null then
    raise exception 'No tenés permiso para actualizar documentos de esta inscripción';
  end if;

  return v_registro;
end;
$$;

grant execute on function public.update_registro_documentos(uuid, text, text, text, text, text) to authenticated;

drop policy if exists registros_read_own_by_email on public.registros;
create policy registros_read_own_by_email
on public.registros
for select
to authenticated
using (deleted_at is null and lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));