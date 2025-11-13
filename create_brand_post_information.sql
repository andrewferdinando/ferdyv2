-- Create table to store analysed social post information per brand
create table if not exists public.brand_post_information (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,

  fb_post_examples text[] default '{}'::text[],
  ig_post_examples text[] default '{}'::text[],
  post_tone text,
  avg_char_length numeric,
  avg_word_count numeric,
  analysed_at timestamptz default now(),

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ensure a brand only has one row
alter table public.brand_post_information
  add constraint brand_post_information_brand_id_key unique (brand_id);

-- Enable RLS and limit access to super admins
alter table public.brand_post_information enable row level security;

drop policy if exists "Super admins manage brand post information" on public.brand_post_information;

create policy "Super admins manage brand post information"
on public.brand_post_information
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.user_id = auth.uid()
      and profiles.role = 'super_admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.user_id = auth.uid()
      and profiles.role = 'super_admin'
  )
);

