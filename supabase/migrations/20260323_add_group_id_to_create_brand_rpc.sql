CREATE OR REPLACE FUNCTION public.rpc_create_brand_with_admin(
  p_user_id uuid,
  p_name text,
  p_timezone text,
  p_group_id uuid,
  p_website_url text DEFAULT NULL::text,
  p_country_code text DEFAULT NULL::text
)
 RETURNS brands
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_brand brands;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;

  IF p_group_id IS NULL THEN
    RAISE EXCEPTION 'Group ID is required';
  END IF;

  -- Validate the user is a member of the specified group
  PERFORM 1 FROM group_memberships
    WHERE user_id = p_user_id AND group_id = p_group_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'You are not a member of the specified group.';
  END IF;

  -- Insert the brand with explicit group_id
  INSERT INTO brands (name, timezone, website_url, country_code, group_id)
  VALUES (
    p_name,
    p_timezone,
    NULLIF(p_website_url, ''),
    NULLIF(p_country_code, ''),
    p_group_id
  )
  RETURNING * INTO new_brand;

  -- Add the creator as an admin of this brand
  INSERT INTO brand_memberships (brand_id, user_id, role)
  VALUES (new_brand.id, p_user_id, 'admin')
  ON CONFLICT (brand_id, user_id) DO UPDATE
  SET role = EXCLUDED.role;

  RETURN new_brand;
END;
$function$;
