create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

alter table public.app_settings enable row level security;

create policy "Admins can read app_settings"
  on public.app_settings for select
  to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));

create policy "Admins can insert app_settings"
  on public.app_settings for insert
  to authenticated
  with check (has_role(auth.uid(), 'admin'::app_role));

create policy "Admins can update app_settings"
  on public.app_settings for update
  to authenticated
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

insert into public.app_settings (key, value)
values ('evolution', '{"base_url":"","api_key":""}'::jsonb)
on conflict (key) do nothing;