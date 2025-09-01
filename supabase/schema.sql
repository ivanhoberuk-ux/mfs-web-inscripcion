-- Esquema bases
create table if not exists public.pueblos (
  id uuid primary key default gen_random_uuid(),
  nombre text unique not null,
  cupo_max int not null default 40,
  activo boolean not null default true
);

create table if not exists public.registros (
  id uuid primary key default gen_random_uuid(),
  nombres text not null,
  apellidos text not null,
  ci text not null,
  nacimiento date not null,
  email text not null,
  telefono text not null,
  direccion text,
  emergencia_nombre text,
  emergencia_telefono text,
  rol text check (rol in ('Tio','Misionero')) not null,
  es_jefe boolean not null default false,
  pueblo_id uuid not null references public.pueblos(id) on delete restrict,
  autorizacion_url text,
  ficha_medica_url text,
  firma_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- Función transaccional para inscribir respetando cupo
create or replace function public.register_if_capacity(
  p_pueblo_id uuid,
  p_nombres text, p_apellidos text, p_ci text, p_nacimiento date,
  p_email text, p_telefono text, p_direccion text,
  p_emergencia_nombre text, p_emergencia_telefono text,
  p_rol text, p_es_jefe boolean
) returns uuid
language plpgsql security definer as
$$
declare v_cupo int; v_usados int; v_id uuid;
begin
  select cupo_max into v_cupo from public.pueblos where id = p_pueblo_id and activo = true;
  if v_cupo is null then
    raise exception 'Pueblo no encontrado o inactivo';
  end if;
  select count(*) into v_usados from public.registros where pueblo_id = p_pueblo_id;
  if v_usados >= v_cupo then
    raise exception 'Cupo completo para este pueblo';
  end if;

  insert into public.registros(nombres,apellidos,ci,nacimiento,email,telefono,direccion,emergencia_nombre,emergencia_telefono,rol,es_jefe,pueblo_id)
  values (p_nombres,p_apellidos,p_ci,p_nacimiento,p_email,p_telefono,p_direccion,p_emergencia_nombre,p_emergencia_telefono,p_rol,p_es_jefe,p_pueblo_id)
  returning id into v_id;

  return v_id;
end;
$$;

-- Habilitar RLS
alter table public.pueblos enable row level security;
alter table public.registros enable row level security;

-- Políticas
-- Pueblos: cualquiera puede ver
create policy pueblos_select on public.pueblos for select using (true);
-- Solo admin puede insertar/actualizar/borrar
create policy pueblos_admin_write on public.pueblos for all
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

-- Registros: cualquiera puede insertar (inscribirse)
create policy registros_insert_any on public.registros for insert with check (true);
-- Lectura/actualización solo para admins
create policy registros_admin_read on public.registros for select using (exists (select 1 from public.admins a where a.user_id = auth.uid()));
create policy registros_admin_update on public.registros for update using (exists (select 1 from public.admins a where a.user_id = auth.uid()));

-- Storage bucket recomendado: 'documentos'. Definir políticas públicas de solo lectura y subida autenticada si deseas.
