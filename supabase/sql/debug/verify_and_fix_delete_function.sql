-- Verification and fix script for rpc_delete_draft function
-- Run this to verify the function is correctly updated

-- Step 1: Show current function definition
SELECT 
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'rpc_delete_draft';

-- Step 2: Verify 'deleted' is in the status constraint
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
JOIN pg_class cl ON c.conrelid = cl.oid
JOIN pg_namespace n ON cl.relnamespace = n.oid
WHERE n.nspname = 'public' 
  AND cl.relname = 'drafts'
  AND c.contype = 'c';

-- Step 3: Force replace the function (use this if Step 1 shows old definition)
-- Drop and recreate to ensure it's updated
DROP FUNCTION IF EXISTS rpc_delete_draft(uuid);

CREATE FUNCTION rpc_delete_draft(p_draft_id uuid)
RETURNS void AS $$
DECLARE
    v_updated_rows integer;
BEGIN
    -- Soft delete: set draft status to 'deleted' instead of hard deleting
    -- Use SECURITY DEFINER to ensure this UPDATE bypasses RLS
    UPDATE drafts 
    SET status = 'deleted' 
    WHERE id = p_draft_id;
    
    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
    
    IF v_updated_rows = 0 THEN
        RAISE EXCEPTION 'Draft not found or could not be updated';
    END IF;
    
    -- Mark all pending/in_progress post_jobs for this draft as cancelled
    UPDATE post_jobs 
    SET status = 'canceled' 
    WHERE draft_id = p_draft_id 
      AND status IN ('pending', 'generated', 'ready', 'publishing');
    
    RAISE NOTICE 'Draft % soft-deleted successfully', p_draft_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Verify the function was created correctly
SELECT 
    p.proname AS function_name,
    CASE 
        WHEN pg_get_functiondef(p.oid) LIKE '%DELETE FROM drafts%' THEN 'HAS HARD DELETE - WRONG!'
        WHEN pg_get_functiondef(p.oid) LIKE '%UPDATE drafts%SET status%' AND pg_get_functiondef(p.oid) LIKE '%deleted%' THEN 'HAS SOFT DELETE - CORRECT!'
        ELSE 'UNKNOWN - CHECK MANUALLY'
    END AS function_check
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'rpc_delete_draft';

