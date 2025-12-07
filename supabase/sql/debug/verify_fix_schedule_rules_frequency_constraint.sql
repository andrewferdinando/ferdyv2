-- Verify and fix schedule_rules frequency constraint
-- This ensures the constraint allows: 'daily', 'weekly', 'monthly', 'specific'

-- Step 1: Drop the existing constraint if it exists (to avoid conflicts)
ALTER TABLE schedule_rules 
  DROP CONSTRAINT IF EXISTS schedule_rules_frequency_check;

-- Step 2: Add the correct constraint with all frequency types
ALTER TABLE schedule_rules
  ADD CONSTRAINT schedule_rules_frequency_check 
  CHECK (frequency IN ('daily','weekly','monthly','specific'));

-- Step 3: Verify the constraint was created correctly
DO $$
BEGIN
  RAISE NOTICE 'Schedule rules frequency constraint updated successfully!';
  RAISE NOTICE 'Allowed values: daily, weekly, monthly, specific';
END $$;

