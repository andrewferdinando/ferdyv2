-- Fix Categories Table Structure
-- Remove brand_id from categories table since categories should be global

-- Step 1: Drop RLS policies that depend on brand_id column
DROP POLICY IF EXISTS "Users can view categories for brands they're members of" ON categories;
DROP POLICY IF EXISTS "Users can manage categories for brands they have edit access to" ON categories;

-- Step 2: Remove the brand_id column from categories table
ALTER TABLE categories DROP COLUMN IF EXISTS brand_id;

-- Step 3: Create new RLS policies for global categories (if needed)
-- Since categories are now global, we might want to allow all authenticated users to view them
-- CREATE POLICY "Users can view all categories" ON categories FOR SELECT TO authenticated USING (true);

-- Step 4: Update the Category interface in the application
-- The categories table should now have: id, name, created_at
-- Subcategories table already has the correct structure: id, brand_id, category_id, name, created_at, updated_at

-- Step 5: Verify the structure
-- Categories: Global categories that apply to all brands
-- Subcategories: Brand-specific subcategories under each global category
