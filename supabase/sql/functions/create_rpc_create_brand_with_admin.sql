-- RPC to create a brand and assign the creator as admin in a single transaction
-- Run this in Supabase SQL editor (or include in migration pipeline) after updating the schema.

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
begin
  if p_user_id is null then
    raise exception 'User ID is required';
  end if;

  insert into brands (name, timezone, website_url, country_code)
  values (
    p_name,
    p_timezone,
    nullif(p_website_url, ''),
    nullif(p_country_code, '')
  )
  returning * into new_brand;

  insert into brand_memberships (brand_id, user_id, role)
  values (new_brand.id, p_user_id, 'admin')
  on conflict (brand_id, user_id) do update
  set role = excluded.role;

  return new_brand;
end;
$$;


