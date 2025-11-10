-- Create brand_invites table for tracking team invitations
create table if not exists public.brand_invites (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin','editor')),
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create unique index if not exists idx_brand_invites_brand_id_email
  on public.brand_invites(brand_id, lower(email));

create index if not exists idx_brand_invites_email
  on public.brand_invites(lower(email));


