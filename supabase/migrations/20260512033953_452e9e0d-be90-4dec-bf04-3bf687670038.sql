create or replace function public.update_registro_documentos_json(
  p_registro_id uuid,
  p_fields jsonb
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
    autorizacion_url = case when p_fields ? 'autorizacion_url' then nullif(p_fields ->> 'autorizacion_url', '') else r.autorizacion_url end,
    ficha_medica_url = case when p_fields ? 'ficha_medica_url' then nullif(p_fields ->> 'ficha_medica_url', '') else r.ficha_medica_url end,
    firma_url = case when p_fields ? 'firma_url' then nullif(p_fields ->> 'firma_url', '') else r.firma_url end,
    cedula_frente_url = case when p_fields ? 'cedula_frente_url' then nullif(p_fields ->> 'cedula_frente_url', '') else r.cedula_frente_url end,
    cedula_dorso_url = case when p_fields ? 'cedula_dorso_url' then nullif(p_fields ->> 'cedula_dorso_url', '') else r.cedula_dorso_url end
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

revoke all on function public.update_registro_documentos_json(uuid, jsonb) from public;
grant execute on function public.update_registro_documentos_json(uuid, jsonb) to authenticated;