-- Backfill NULL name values in profiles table from full_name
-- This ensures all users have a value in the name column
UPDATE profiles
SET name = full_name
WHERE name IS NULL AND full_name IS NOT NULL;
