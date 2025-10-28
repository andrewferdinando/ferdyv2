-- Ensure times_of_day column exists in schedule_rules table
-- This is needed for specific date/range frequency scheduling

-- Add times_of_day column if it doesn't exist
ALTER TABLE schedule_rules
  ADD COLUMN IF NOT EXISTS times_of_day time[] DEFAULT '{}';

-- Add comment
COMMENT ON COLUMN schedule_rules.times_of_day IS 'Array of times to schedule posts for specific frequency (e.g., {09:00,15:00})';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'times_of_day column ensured in schedule_rules table!';
END $$;

