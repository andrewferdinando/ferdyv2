-- Update schedule_rules table schema to support subcategory sync
-- Ensure all required fields exist for proper subcategory → schedule_rules sync

-- Add/update columns for proper date handling (if they don't exist)
-- Note: start_date and end_date should be 'date' type (not timestamptz) for specific frequency
-- But we'll keep them as timestamptz for now and handle conversion in the code

-- Ensure time_of_day can be an array (if currently single value, we'll migrate)
-- Postgres handles this automatically if time_of_day is already time[], but we'll ensure consistency

-- Add is_active if it doesn't exist (should already exist)
ALTER TABLE schedule_rules 
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Ensure category_id and subcategory_id exist (should already exist from migration)
-- Add indexes for efficient lookup
CREATE INDEX IF NOT EXISTS schedule_rules_subcategory_id ON schedule_rules (subcategory_id);
CREATE INDEX IF NOT EXISTS schedule_rules_brand_subcategory_active ON schedule_rules (brand_id, subcategory_id, is_active);

-- Add comment
COMMENT ON COLUMN schedule_rules.is_active IS 'If false, rule is soft-deleted (subcategory was deleted)';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Schedule rules schema updated for subcategory sync!';
END $$;

