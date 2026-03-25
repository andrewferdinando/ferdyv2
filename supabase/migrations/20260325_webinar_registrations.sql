-- Webinar registrations table
create table if not exists public.webinar_registrations (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  email text not null,
  webinar_slug text not null,
  webinar_name text not null,
  niche text not null,
  location text not null,
  created_at timestamptz not null default now()
);

-- Index for querying by webinar (needed for email sequences)
create index idx_webinar_registrations_slug on public.webinar_registrations (webinar_slug);

-- Unique constraint: one registration per email per webinar
create unique index idx_webinar_registrations_email_slug
  on public.webinar_registrations (email, webinar_slug);

-- RLS: anon can insert, reads locked down
alter table public.webinar_registrations enable row level security;

create policy "Allow anonymous inserts"
  on public.webinar_registrations
  for insert
  to anon
  with check (true);

create policy "Service role full access"
  on public.webinar_registrations
  for all
  to service_role
  using (true)
  with check (true);
