-- Add detail column to schedule_rules table
-- This allows storing occurrence-specific details (e.g., capacity, features) for date/date_range occurrences

-- Add detail column if it doesn't exist
ALTER TABLE schedule_rules
  ADD COLUMN IF NOT EXISTS detail TEXT;

-- Add comment for documentation
COMMENT ON COLUMN schedule_rules.detail IS 'Occurrence-specific details (e.g., capacity, features) for date/date_range occurrences';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Detail column added to schedule_rules table!';
END $$;



