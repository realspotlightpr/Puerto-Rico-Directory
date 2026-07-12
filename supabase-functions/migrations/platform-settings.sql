create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users(id)
);
alter table public.platform_settings enable row level security;
create policy "platform settings are publicly readable" on public.platform_settings for select using (true);
create policy "admins manage platform settings" on public.platform_settings for all
using (exists (select 1 from public.users where users.id::text = auth.uid()::text and users.role = 'admin'))
with check (exists (select 1 from public.users where users.id::text = auth.uid()::text and users.role = 'admin'));
