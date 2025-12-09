-- Migration: Simplify role structure and fix add brand RPC
-- Date: 2025-01-09
-- Description: 
--   1. Fix rpc_create_brand_with_admin to include group_id
--   2. Convert all 'owner' roles to 'admin' in both profiles and group_memberships
--   3. Update role constraints to only allow simplified roles

-- Part 1: Fix the RPC function to include group_id
CREATE OR REPLACE FUNCTION public.rpc_create_brand_with_admin(
  p_user_id uuid,
  p_name text,
  p_timezone text,
  p_website_url text DEFAULT NULL,
  p_country_code text DEFAULT NULL
) RETURNS brands
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_brand brands;
  user_group_id uuid;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;

  -- Get the user's group_id
  SELECT group_id INTO user_group_id
  FROM group_memberships
  WHERE user_id = p_user_id
  LIMIT 1;

  IF user_group_id IS NULL THEN
    RAISE EXCEPTION 'User is not a member of any group. Please complete onboarding first.';
  END IF;

  -- Insert the brand with group_id
  INSERT INTO brands (name, timezone, website_url, country_code, group_id)
  VALUES (
    p_name,
    p_timezone,
    NULLIF(p_website_url, ''),
    NULLIF(p_country_code, ''),
    user_group_id
  )
  RETURNING * INTO new_brand;

  -- Add the creator as an admin of this brand
  INSERT INTO brand_memberships (brand_id, user_id, role)
  VALUES (new_brand.id, p_user_id, 'admin')
  ON CONFLICT (brand_id, user_id) DO UPDATE
  SET role = EXCLUDED.role;

  RETURN new_brand;
END;
$$;

-- Part 2: Convert all 'owner' roles to 'admin' in profiles table
UPDATE profiles
SET role = 'admin'
WHERE role = 'owner';

-- Part 3: Convert all 'owner' roles to 'admin' in group_memberships table
UPDATE group_memberships
SET role = 'admin'
WHERE role = 'owner';

-- Part 4: Convert all 'owner' roles to 'admin' in brand_memberships table
-- (Brand memberships should only have 'admin' or 'editor', but clean up just in case)
UPDATE brand_memberships
SET role = 'admin'
WHERE role = 'owner';

-- Part 5: Add comments for documentation
COMMENT ON FUNCTION public.rpc_create_brand_with_admin IS 
'Creates a new brand and assigns the creator as a brand admin. Automatically determines group_id from user membership.';

COMMENT ON COLUMN profiles.role IS 
'Group-level role: super_admin (system owner only), admin (full account access), or member (limited access)';

COMMENT ON COLUMN group_memberships.role IS 
'Group-level role: super_admin, admin, or member';

COMMENT ON COLUMN brand_memberships.role IS 
'Brand-level role: admin (can manage brand) or editor (can only create content)';
