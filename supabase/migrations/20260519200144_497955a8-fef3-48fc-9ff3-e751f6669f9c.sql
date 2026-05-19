create table if not exists public.password_reset_rate_limits (
  email_hash text primary key,
  last_requested_at timestamp with time zone not null default now(),
  request_count integer not null default 1
);

alter table public.password_reset_rate_limits enable row level security;

revoke all on public.password_reset_rate_limits from anon, authenticated;

grant select, insert, update on public.password_reset_rate_limits to service_role;

create index if not exists idx_password_reset_rate_limits_last_requested_at
  on public.password_reset_rate_limits (last_requested_at);