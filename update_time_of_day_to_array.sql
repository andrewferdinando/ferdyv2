-- Update time_of_day column to support arrays for specific frequency
-- Change from time (single) to time[] (array) to support multiple times per day

-- Step 1: Backup existing data (optional but recommended)
-- Note: Existing single time values will be converted to arrays automatically

-- Step 2: Change column type from time to time[]
-- This will convert existing single time values to arrays with one element
ALTER TABLE schedule_rules
  ALTER COLUMN time_of_day TYPE time[] USING 
    CASE 
      WHEN time_of_day IS NULL THEN NULL::time[]
      ELSE ARRAY[time_of_day]::time[]
    END;

-- Step 3: Update comment
COMMENT ON COLUMN schedule_rules.time_of_day IS 'Array of times to schedule posts. Single element array for daily/weekly/monthly, multiple elements for specific frequency (e.g., {09:00} or {09:00,15:00})';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'time_of_day column updated to time[] array type successfully!';
  RAISE NOTICE 'Existing single time values have been converted to single-element arrays.';
END $$;

