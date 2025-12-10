-- Add status column to brands table for soft-delete functionality
ALTER TABLE brands 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- Add check constraint to ensure valid status values
ALTER TABLE brands 
ADD CONSTRAINT brands_status_check 
CHECK (status IN ('active', 'inactive'));

-- Create index for filtering by status
CREATE INDEX IF NOT EXISTS idx_brands_status ON brands(status);

-- Update existing brands to have 'active' status
UPDATE brands 
SET status = 'active' 
WHERE status IS NULL;

-- Add comment
COMMENT ON COLUMN brands.status IS 'Status of the brand: active or inactive (soft-deleted)';
