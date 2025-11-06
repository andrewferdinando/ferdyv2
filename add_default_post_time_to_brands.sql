-- Add default_post_time column to brands table
-- This allows each brand to have a default time that auto-populates when creating new subcategories

ALTER TABLE brands ADD COLUMN IF NOT EXISTS default_post_time TIME;

-- Add comment to document the column
COMMENT ON COLUMN brands.default_post_time IS 'Default time (HH:MM) that auto-populates when creating new subcategories. Users can override this per subcategory.';

-- Create a trigger function to apply default_post_time when time_of_day is null or empty
-- This provides server-side safety for older clients or direct database inserts
CREATE OR REPLACE FUNCTION apply_default_post_time()
RETURNS TRIGGER AS $$
DECLARE
    v_default_time TIME;
BEGIN
    -- Only apply if time_of_day is null or empty array
    IF NEW.time_of_day IS NULL OR array_length(NEW.time_of_day, 1) IS NULL THEN
        -- Get default_post_time from brand
        SELECT default_post_time INTO v_default_time
        FROM brands
        WHERE id = NEW.brand_id;
        
        -- If brand has a default_post_time, apply it
        IF v_default_time IS NOT NULL THEN
            NEW.time_of_day := ARRAY[v_default_time]::time[];
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to apply default_post_time before insert
DROP TRIGGER IF EXISTS trigger_apply_default_post_time ON schedule_rules;
CREATE TRIGGER trigger_apply_default_post_time
    BEFORE INSERT ON schedule_rules
    FOR EACH ROW
    EXECUTE FUNCTION apply_default_post_time();

-- Add comment to document the trigger
COMMENT ON FUNCTION apply_default_post_time() IS 'Automatically applies brand.default_post_time to schedule_rules.time_of_day if it is null or empty. Provides server-side safety for older clients.';

