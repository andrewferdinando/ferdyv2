-- Add published_at column to post_jobs table (optional per-job timestamp)
-- This tracks when each individual post_job was successfully published

-- Step 1: Add published_at column to post_jobs table
ALTER TABLE post_jobs
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

-- Step 2: Backfill published_at for existing successful post_jobs
-- Use scheduled_at as a reasonable approximation for historical data
UPDATE post_jobs
SET published_at = scheduled_at
WHERE status IN ('success', 'published')
  AND published_at IS NULL;

-- Step 3: Add index for efficient querying by published_at
CREATE INDEX IF NOT EXISTS post_jobs_published_at ON post_jobs (published_at)
WHERE published_at IS NOT NULL;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'published_at column added to post_jobs table and backfilled successfully!';
END $$;

