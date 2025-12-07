-- Add 'deleted' status to drafts table
-- This allows soft-deleting drafts instead of hard-deleting them

-- Step 1: Update the status constraint to include 'deleted'
-- IMPORTANT: This must run BEFORE Step 2 (the function definition)
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
    v_current_status text;
    v_draft_exists boolean;
BEGIN
    -- First, verify the draft exists and get its current status
    SELECT status, true INTO v_current_status, v_draft_exists
    FROM drafts
    WHERE id = p_draft_id;
    
    -- If draft doesn't exist, raise exception
    IF NOT v_draft_exists THEN
        RAISE EXCEPTION 'Draft not found: %', p_draft_id;
    END IF;
    
    -- Log what we're about to do (for debugging)
    RAISE NOTICE '[rpc_delete_draft] Soft-deleting draft % (current status: %)', p_draft_id, v_current_status;
    
    -- Soft delete: set draft status to 'deleted' instead of hard deleting
    -- Use SECURITY DEFINER to ensure this UPDATE bypasses RLS
    UPDATE drafts 
    SET status = 'deleted' 
    WHERE id = p_draft_id;
    
    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
    
    -- Verify the update succeeded
    IF v_updated_rows = 0 THEN
        RAISE EXCEPTION 'Failed to update draft % - RLS or constraint may be blocking the UPDATE', p_draft_id;
    END IF;
    
    RAISE NOTICE '[rpc_delete_draft] Draft % soft-deleted successfully (% row updated)', p_draft_id, v_updated_rows;
    
    -- Mark all pending/in_progress post_jobs for this draft as cancelled
    -- This prevents any future publishing attempts for this draft
    UPDATE post_jobs 
    SET status = 'canceled' 
    WHERE draft_id = p_draft_id 
      AND status IN ('pending', 'generated', 'ready', 'publishing');
    
    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
    IF v_updated_rows > 0 THEN
        RAISE NOTICE '[rpc_delete_draft] Cancelled % post_jobs for draft %', v_updated_rows, p_draft_id;
    END IF;
    
    -- Note: We leave 'success' and 'failed' post_jobs as-is for audit trail
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
