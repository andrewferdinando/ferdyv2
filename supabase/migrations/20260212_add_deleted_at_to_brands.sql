ALTER TABLE brands ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_brands_deleted_at ON brands(deleted_at);
