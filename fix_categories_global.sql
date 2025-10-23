-- Fix Categories Table Structure
-- Remove brand_id from categories table since categories should be global

-- Step 1: Remove the brand_id column from categories table
ALTER TABLE categories DROP COLUMN IF EXISTS brand_id;

-- Step 2: Update the Category interface in the application
-- The categories table should now have: id, name, created_at
-- Subcategories table already has the correct structure: id, brand_id, category_id, name, created_at, updated_at

-- Step 3: Verify the structure
-- Categories: Global categories that apply to all brands
-- Subcategories: Brand-specific subcategories under each global category
