-- Fix profiles name field and trigger
-- This migration fixes the issue where user names aren't being populated in profiles

-- Step 1: Add name column to profiles if it doesn't exist (in case it was renamed from full_name)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'name'
    ) THEN
        -- Add name column
        ALTER TABLE profiles ADD COLUMN name TEXT;
        
        -- Copy full_name to name where name is NULL
        UPDATE profiles SET name = full_name WHERE name IS NULL AND full_name IS NOT NULL;
    ELSE
        -- If name column exists but is NULL, copy from full_name
        UPDATE profiles SET name = full_name WHERE name IS NULL AND full_name IS NOT NULL;
    END IF;
    
    -- Also ensure full_name is populated if name exists but full_name doesn't
    UPDATE profiles SET full_name = name WHERE full_name IS NULL AND name IS NOT NULL;
END $$;

-- Step 2: Update the trigger function to populate both full_name and name
CREATE OR REPLACE FUNCTION public.handle_new_user_with_brand()
RETURNS trigger AS $$
DECLARE
    v_brand_id uuid;
    v_brand_name text;
    v_brand_website_url text;
    v_brand_country_code text;
    v_brand_timezone text;
    v_user_name text;
BEGIN
    -- Extract user and brand data from user metadata
    v_user_name := new.raw_user_meta_data->>'name';
    v_brand_name := new.raw_user_meta_data->>'brand_name';
    v_brand_website_url := new.raw_user_meta_data->>'brand_website_url';
    v_brand_country_code := new.raw_user_meta_data->>'brand_country_code';
    v_brand_timezone := new.raw_user_meta_data->>'brand_timezone';
    
    -- Create profile with both full_name and name (if name column exists)
    -- Use COALESCE to handle cases where name might not be in metadata
    INSERT INTO public.profiles (user_id, full_name, name)
    VALUES (
        new.id, 
        v_user_name,
        v_user_name
    )
    ON CONFLICT (user_id) DO UPDATE
    SET 
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        name = COALESCE(EXCLUDED.name, profiles.name, profiles.full_name);
    
    -- Create brand if brand data is provided
    IF v_brand_name IS NOT NULL THEN
        INSERT INTO public.brands (
            name, 
            website_url, 
            country_code, 
            timezone
        ) VALUES (
            v_brand_name,
            v_brand_website_url,
            v_brand_country_code,
            COALESCE(v_brand_timezone, 'Pacific/Auckland')
        ) RETURNING id INTO v_brand_id;
        
        -- Create brand membership for the user as owner
        INSERT INTO public.brand_memberships (brand_id, user_id, role)
        VALUES (v_brand_id, new.id, 'owner');
    END IF;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create a view user_profiles if it doesn't exist (maps full_name to name for compatibility)
-- This view provides compatibility with queries expecting a 'name' column
-- Field: name (from profiles.name or profiles.full_name)
CREATE OR REPLACE VIEW user_profiles AS
SELECT 
    user_id as id,
    COALESCE(name, full_name) as name,
    full_name,
    role,
    created_at,
    last_login_at,
    user_id
FROM profiles;

-- Step 4: Create or replace brand_memberships_with_names view
-- This view joins brand_memberships with profiles to show user_name
-- Field: user_name (from profiles.name or profiles.full_name)
CREATE OR REPLACE VIEW brand_memberships_with_names AS
SELECT 
    bm.id,
    bm.brand_id,
    bm.user_id,
    COALESCE(p.name, p.full_name) as user_name,
    bm.role,
    bm.created_at
FROM brand_memberships bm
LEFT JOIN profiles p ON bm.user_id = p.user_id;

-- Step 5: Update existing profiles that have NULL names (backfill)
UPDATE profiles p
SET 
    name = COALESCE(p.name, p.full_name),
    full_name = COALESCE(p.full_name, p.name)
WHERE p.name IS NULL OR p.full_name IS NULL;

-- Step 6: The user_profiles view can be joined via user_id
-- Queries like `user_profiles!inner(name)` work because Supabase can match user_id
-- brand_memberships.user_id -> user_profiles.user_id (through the view)

-- Step 7: Grant permissions on the views
GRANT SELECT ON user_profiles TO authenticated;
GRANT SELECT ON user_profiles TO anon;
GRANT SELECT ON brand_memberships_with_names TO authenticated;
GRANT SELECT ON brand_memberships_with_names TO anon;

-- Step 8: Update the trigger function comment for clarity
COMMENT ON FUNCTION public.handle_new_user_with_brand() IS 
'Creates user profile and brand on signup. Populates both full_name and name columns for compatibility.';

-- Step 9: Add comments for clarity
COMMENT ON VIEW user_profiles IS 
'View of profiles with name field (mapped from full_name). Use this for queries expecting a name column.';

COMMENT ON VIEW brand_memberships_with_names IS 
'View of brand_memberships joined with profiles. Field: user_name (from profiles.name or profiles.full_name).';
