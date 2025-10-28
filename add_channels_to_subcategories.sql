-- Add channels field to subcategories table
-- This stores the social media channels where posts from this subcategory should be published

ALTER TABLE subcategories
  ADD COLUMN IF NOT EXISTS channels text[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN subcategories.channels IS 'Array of social media channels for posts in this subcategory (e.g., ["instagram", "facebook", "tiktok"])';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Channels column added to subcategories table successfully!';
END $$;

