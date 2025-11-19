-- Add 'deleted' status to drafts table
-- This allows soft-deleting drafts instead of hard-deleting them

-- Step 1: Check if status column exists and has a check constraint
-- If status column exists without constraint, we need to find and update the constraint
-- For now, we'll drop any existing constraint and add a new one

DO $$
BEGIN
    -- Drop existing constraint if it exists
    ALTER TABLE drafts DROP CONSTRAINT IF EXISTS drafts_status_check;
    
    -- Add new constraint that includes 'deleted'
    ALTER TABLE drafts
    ADD CONSTRAINT drafts_status_check 
    CHECK (status IN ('draft', 'scheduled', 'partially_published', 'published', 'deleted'));
    
    RAISE NOTICE 'Added deleted status to drafts table constraint';
END $$;

