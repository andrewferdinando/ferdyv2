-- Check for triggers and test the delete function
-- Run this AFTER running add_deleted_status_to_drafts.sql

-- 1. Check for triggers on drafts table (these could interfere with soft delete)
SELECT 
    t.tgname AS trigger_name,
    pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' 
  AND c.relname = 'drafts'
  AND NOT t.tgisinternal;

-- 2. Verify the constraint includes 'deleted'
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
JOIN pg_class cl ON c.conrelid = cl.oid
JOIN pg_namespace n ON cl.relnamespace = n.oid
WHERE n.nspname = 'public' 
  AND cl.relname = 'drafts'
  AND c.contype = 'c'
  AND conname LIKE '%status%';

-- 3. Verify the function exists and is correct
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

-- 4. Test with a real draft ID (replace 'YOUR_DRAFT_ID' with an actual draft ID)
-- IMPORTANT: This will actually soft-delete the draft!
-- Uncomment and modify the draft_id to test:
/*
DO $$
DECLARE
    v_test_draft_id uuid := 'YOUR_DRAFT_ID_HERE'::uuid;
    v_before_count integer;
    v_after_count integer;
    v_before_status text;
    v_after_status text;
BEGIN
    -- Check before
    SELECT COUNT(*), MAX(status) INTO v_before_count, v_before_status
    FROM drafts WHERE id = v_test_draft_id;
    
    RAISE NOTICE '=== BEFORE DELETE ===';
    RAISE NOTICE 'Draft exists: %', v_before_count > 0;
    RAISE NOTICE 'Current status: %', v_before_status;
    
    -- Call the delete function
    PERFORM rpc_delete_draft(v_test_draft_id);
    
    -- Check after
    SELECT COUNT(*), MAX(status) INTO v_after_count, v_after_status
    FROM drafts WHERE id = v_test_draft_id;
    
    RAISE NOTICE '=== AFTER DELETE ===';
    RAISE NOTICE 'Draft exists: %', v_after_count > 0;
    RAISE NOTICE 'New status: %', v_after_status;
    
    IF v_after_count = 0 THEN
        RAISE WARNING 'DRAFT WAS HARD-DELETED! This should not happen.';
    ELSIF v_after_status = 'deleted' THEN
        RAISE NOTICE 'SUCCESS: Draft was soft-deleted correctly (status = deleted)';
    ELSE
        RAISE WARNING 'UNEXPECTED: Draft still exists but status is % (expected: deleted)', v_after_status;
    END IF;
END $$;
*/

