-- Verify that ai_summary columns exist on brands table
-- Run this in Supabase SQL Editor to check

-- Check if columns exist
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'brands'
  AND column_name IN ('ai_summary', 'ai_summary_last_generated_at');

-- If the query returns no rows, the columns don't exist yet - run add_ai_summary_to_brands.sql migration
-- If it returns 2 rows, the columns exist and the migration has been run

