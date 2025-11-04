-- Fix schedule_rules_specific_chk constraint to use correct column name
-- The constraint currently checks 'times_of_day' but the actual column is 'time_of_day'

-- Step 1: Drop the existing constraint
ALTER TABLE schedule_rules 
  DROP CONSTRAINT IF EXISTS schedule_rules_specific_chk;

-- Step 2: Recreate the constraint with the correct column name (time_of_day)
ALTER TABLE schedule_rules
  ADD CONSTRAINT schedule_rules_specific_chk
  CHECK (
    (frequency <> 'specific'::text) OR (
      (start_date IS NOT NULL) AND 
      (
        (end_date IS NOT NULL) OR 
        ((days_during IS NOT NULL) AND (cardinality(days_during) > 0))
      ) AND 
      (time_of_day IS NOT NULL) AND 
      (cardinality(time_of_day) > 0)
    )
  );

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Constraint schedule_rules_specific_chk updated to use time_of_day column!';
END $$;

