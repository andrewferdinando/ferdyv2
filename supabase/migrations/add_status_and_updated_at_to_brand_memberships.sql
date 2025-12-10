-- Add status column to brand_memberships table
ALTER TABLE brand_memberships 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- Add check constraint to ensure valid status values
ALTER TABLE brand_memberships 
ADD CONSTRAINT brand_memberships_status_check 
CHECK (status IN ('active', 'inactive'));

-- Create index for filtering by status
CREATE INDEX IF NOT EXISTS idx_brand_memberships_status ON brand_memberships(status);

-- Add updated_at column to brand_memberships table
ALTER TABLE brand_memberships 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create trigger to automatically update updated_at on row updates
CREATE OR REPLACE FUNCTION update_brand_memberships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER brand_memberships_updated_at_trigger
  BEFORE UPDATE ON brand_memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_brand_memberships_updated_at();

-- Initialize status and updated_at for existing rows
UPDATE brand_memberships 
SET status = 'active' 
WHERE status IS NULL;

UPDATE brand_memberships 
SET updated_at = created_at 
WHERE updated_at IS NULL AND created_at IS NOT NULL;

UPDATE brand_memberships 
SET updated_at = NOW() 
WHERE updated_at IS NULL AND created_at IS NULL;

-- Add comments
COMMENT ON COLUMN brand_memberships.status IS 'Status of the membership: active or inactive (soft-deleted)';
COMMENT ON COLUMN brand_memberships.updated_at IS 'Timestamp of last update to this membership record';
