-- Add post_time column to subcategories table
-- This stores the default post time for this subcategory (inherits from brand_post_information.default_post_time on creation)

ALTER TABLE subcategories 
  ADD COLUMN IF NOT EXISTS post_time TIME;

-- Add comment to document the column
COMMENT ON COLUMN subcategories.post_time IS 'Default post time for this subcategory. Inherits from brand_post_information.default_post_time when created.';

