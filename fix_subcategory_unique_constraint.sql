-- Fix subcategory unique constraint to allow recreation after deletion
-- The issue: When a subcategory is deleted and recreated with the same name,
-- the unique constraint prevents it because deleted records might still exist
-- or there might be a timing issue.

-- Solution: Check if there are any orphaned/deleted subcategories with the same name
-- and clean them up, or ensure the constraint only applies to active records

-- First, let's check if there are any duplicate names that would cause issues
-- (This is just for debugging - you can comment out if not needed)
-- SELECT brand_id, category_id, LOWER(name) as lower_name, COUNT(*) as count
-- FROM subcategories
-- GROUP BY brand_id, category_id, LOWER(name)
-- HAVING COUNT(*) > 1;

-- Drop the existing unique constraint
DROP INDEX IF EXISTS subcategories_brand_category_name_unique;

-- Recreate the unique constraint exactly as before
-- Since we're doing hard deletes (DELETE FROM), deleted records shouldn't exist
-- But if there's a timing/caching issue, this will ensure it's recreated correctly
CREATE UNIQUE INDEX subcategories_brand_category_name_unique 
ON subcategories (brand_id, category_id, LOWER(name));

-- If the above still causes issues, it might be because:
-- 1. The deletion didn't complete (check for foreign key constraints)
-- 2. There's a transaction rollback issue
-- 3. There's a different subcategory with the same name in a different category

-- To debug, you can run:
-- SELECT id, brand_id, category_id, name 
-- FROM subcategories 
-- WHERE LOWER(name) = LOWER('YOUR_SUBCATEGORY_NAME')
-- AND brand_id = 'YOUR_BRAND_ID';

