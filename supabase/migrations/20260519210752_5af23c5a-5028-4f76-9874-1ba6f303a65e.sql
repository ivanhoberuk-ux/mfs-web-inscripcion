create or replace function public.get_lista_espera_position(p_registro_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case
    when r.estado <> 'lista_espera' or r.deleted_at is not null then null
    else (
      select count(*)::int + 1
      from public.registros x
      where x.pueblo_id = r.pueblo_id
        and x."año" = r."año"
        and x.estado = 'lista_espera'
        and x.deleted_at is null
        and x.created_at < r.created_at
    )
  end
  from public.registros r
  where r.id = p_registro_id;
$$;

grant execute on function public.get_lista_espera_position(uuid) to anon, authenticated;