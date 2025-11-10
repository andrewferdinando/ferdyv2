-- Create brand_invites table for tracking team invitations
create table if not exists public.brand_invites (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  email text not null check (email = lower(email)),
  invitee_name text,
  role text not null check (role in ('admin','editor')),
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

drop index if exists idx_brand_invites_brand_id_email;

create unique index if not exists brand_invites_brand_id_email_unique
  on public.brand_invites(brand_id, email);

create index if not exists idx_brand_invites_email_lower
  on public.brand_invites(email);


