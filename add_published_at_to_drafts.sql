-- Add published_at column to drafts table
-- This tracks when a draft was actually published (regardless of scheduled time)

-- Step 1: Add published_at column to drafts table
ALTER TABLE drafts
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

-- Step 2: Backfill published_at for existing published/partially_published drafts
-- Use scheduled_for if available, otherwise use created_at as a reasonable fallback
UPDATE drafts
SET published_at = COALESCE(scheduled_for, created_at)
WHERE status IN ('published', 'partially_published')
  AND published_at IS NULL;

-- Step 3: Add index for efficient querying by published_at
CREATE INDEX IF NOT EXISTS drafts_published_at ON drafts (published_at)
WHERE published_at IS NOT NULL;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'published_at column added to drafts table and backfilled successfully!';
END $$;

