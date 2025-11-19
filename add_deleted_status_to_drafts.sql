-- Add 'deleted' status to drafts table
-- This allows soft-deleting drafts instead of hard-deleting them

-- Step 1: Update the status constraint to include 'deleted'
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

-- Step 2: Update rpc_delete_draft function to soft delete instead of hard delete
-- IMPORTANT: This function must use SECURITY DEFINER to bypass RLS policies
CREATE OR REPLACE FUNCTION rpc_delete_draft(p_draft_id uuid)
RETURNS void AS $$
DECLARE
    v_updated_rows integer;
BEGIN
    -- Soft delete: set draft status to 'deleted' instead of hard deleting
    -- Use SECURITY DEFINER to ensure this UPDATE bypasses RLS
    -- This will fail if draft doesn't exist (which is what we want)
    UPDATE drafts 
    SET status = 'deleted' 
    WHERE id = p_draft_id;
    
    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
    
    IF v_updated_rows = 0 THEN
        RAISE EXCEPTION 'Draft not found or could not be updated';
    END IF;
    
    -- Mark all pending/in_progress post_jobs for this draft as cancelled
    -- This prevents any future publishing attempts for this draft
    UPDATE post_jobs 
    SET status = 'canceled' 
    WHERE draft_id = p_draft_id 
      AND status IN ('pending', 'generated', 'ready', 'publishing');
    
    -- Note: We leave 'success' and 'failed' post_jobs as-is for audit trail
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

