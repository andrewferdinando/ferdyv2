-- Add 'failed' status to drafts table
-- This allows marking drafts as failed when all post_jobs fail (e.g. disconnected account)
-- Run this in Supabase SQL Editor

DO $$
BEGIN
    -- Drop existing constraint if it exists
    ALTER TABLE drafts DROP CONSTRAINT IF EXISTS drafts_status_check;

    -- Add new constraint that includes 'failed'
    ALTER TABLE drafts
    ADD CONSTRAINT drafts_status_check
    CHECK (status IN ('draft', 'scheduled', 'partially_published', 'published', 'deleted', 'failed'));

    RAISE NOTICE 'Added failed status to drafts table constraint';
END $$;
