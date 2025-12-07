-- Add Specific Date/Range scheduling option to schedule_rules table
-- This allows scheduling posts for specific dates or date ranges (e.g., seasonal events)

-- Step 1: Update frequency CHECK constraint to include 'specific'
ALTER TABLE schedule_rules 
  DROP CONSTRAINT IF EXISTS schedule_rules_frequency_check;

ALTER TABLE schedule_rules
  ADD CONSTRAINT schedule_rules_frequency_check 
  CHECK (frequency IN ('daily','weekly','monthly','specific'));

-- Step 2: Add new columns for specific date/range scheduling
ALTER TABLE schedule_rules
  ADD COLUMN IF NOT EXISTS start_date timestamptz,
  ADD COLUMN IF NOT EXISTS end_date timestamptz,
  ADD COLUMN IF NOT EXISTS days_before int[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS days_during int[],
  ADD COLUMN IF NOT EXISTS times_of_day time[] DEFAULT '{}';

-- Step 3: Update timezone column to ensure it can store IANA timezone strings
-- (timezone is already text, so no change needed, but ensure it's not null for specific rules)

-- Step 4: Add comments for documentation
COMMENT ON COLUMN schedule_rules.frequency IS 'Frequency type: daily, weekly, monthly, or specific (for seasonal events)';
COMMENT ON COLUMN schedule_rules.start_date IS 'Start date for specific date/range frequency (timestamptz)';
COMMENT ON COLUMN schedule_rules.end_date IS 'End date for specific date/range frequency (null or equal to start_date for single date)';
COMMENT ON COLUMN schedule_rules.days_before IS 'Array of days before start_date to schedule posts (e.g., {5,3,1})';
COMMENT ON COLUMN schedule_rules.days_during IS 'Array of days after start_date (within range) to schedule posts (e.g., {2,3,5}), null for single date';
COMMENT ON COLUMN schedule_rules.times_of_day IS 'Array of times to schedule posts (e.g., {09:00,15:00})';
COMMENT ON COLUMN schedule_rules.timezone IS 'IANA timezone string (e.g., Pacific/Auckland) for converting local times to UTC';

-- Step 5: Create index for efficient querying of specific date rules
CREATE INDEX IF NOT EXISTS schedule_rules_specific_dates 
  ON schedule_rules (frequency, start_date, end_date) 
  WHERE frequency = 'specific';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Specific Date/Range scheduling fields added to schedule_rules table successfully!';
END $$;

