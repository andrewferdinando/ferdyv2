-- Add updated_at column to brands table
ALTER TABLE brands 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create trigger to automatically update updated_at on row updates
CREATE OR REPLACE FUNCTION update_brands_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER brands_updated_at_trigger
  BEFORE UPDATE ON brands
  FOR EACH ROW
  EXECUTE FUNCTION update_brands_updated_at();

-- Initialize updated_at for existing rows
UPDATE brands 
SET updated_at = created_at 
WHERE updated_at IS NULL AND created_at IS NOT NULL;

UPDATE brands 
SET updated_at = NOW() 
WHERE updated_at IS NULL AND created_at IS NULL;

-- Add comment
COMMENT ON COLUMN brands.updated_at IS 'Timestamp of last update to this brand record';
