-- Migration: Fix rpc_create_brand_with_admin to support Groups architecture
-- Date: 2025-01-09
-- Description: Update the RPC function to include group_id when creating brands

create or replace function public.rpc_create_brand_with_admin(
  p_user_id uuid,
  p_name text,
  p_timezone text,
  p_website_url text default null,
  p_country_code text default null
) returns brands
language plpgsql
security definer
set search_path = public
as $$
declare
  new_brand brands;
  user_group_id uuid;
begin
  if p_user_id is null then
    raise exception 'User ID is required';
  end if;

  -- Get the user's group_id
  select group_id into user_group_id
  from group_memberships
  where user_id = p_user_id
  limit 1;

  if user_group_id is null then
    raise exception 'User is not a member of any group. Please complete onboarding first.';
  end if;

  -- Insert the brand with group_id
  insert into brands (name, timezone, website_url, country_code, group_id)
  values (
    p_name,
    p_timezone,
    nullif(p_website_url, ''),
    nullif(p_country_code, ''),
    user_group_id
  )
  returning * into new_brand;

  -- Add the creator as an admin of this brand
  insert into brand_memberships (brand_id, user_id, role)
  values (new_brand.id, p_user_id, 'admin')
  on conflict (brand_id, user_id) do update
  set role = excluded.role;

  return new_brand;
end;
$$;
