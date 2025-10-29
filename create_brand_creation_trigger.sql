-- Create trigger to automatically create brand when user signs up with brand metadata
-- This ensures brands are created from user signup metadata

-- Function to create brand from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user_with_brand()
RETURNS trigger AS $$
DECLARE
    v_brand_id uuid;
    v_brand_name text;
    v_brand_website_url text;
    v_brand_country_code text;
    v_brand_timezone text;
BEGIN
    -- Extract brand data from user metadata
    v_brand_name := new.raw_user_meta_data->>'brand_name';
    v_brand_website_url := new.raw_user_meta_data->>'brand_website_url';
    v_brand_country_code := new.raw_user_meta_data->>'brand_country_code';
    v_brand_timezone := new.raw_user_meta_data->>'brand_timezone';
    
    -- Create profile first
    INSERT INTO public.profiles (user_id, full_name)
    VALUES (new.id, new.raw_user_meta_data->>'full_name');
    
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

-- Drop the old trigger and create the new one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_with_brand();
