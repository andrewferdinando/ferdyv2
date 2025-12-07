-- Check what the schedule_rules_specific_chk constraint validates
-- Run this in Supabase SQL Editor to see what the constraint checks

SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'schedule_rules_specific_chk';

-- If the constraint doesn't exist, it might be checking something else
-- Check all constraints on schedule_rules table
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'schedule_rules'::regclass
ORDER BY conname;

