-- Add url_page_summary column to subcategories table
-- This field will hold cleaned text from the subcategory URL (first few thousand characters)

ALTER TABLE subcategories
  ADD COLUMN IF NOT EXISTS url_page_summary text;

-- Add comment for documentation
COMMENT ON COLUMN subcategories.url_page_summary IS 'Cleaned text summary extracted from the subcategory URL page (first ~4000 characters)';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'url_page_summary column added to subcategories table successfully!';
END $$;

