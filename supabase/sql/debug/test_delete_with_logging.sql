-- Test the delete function with detailed logging
-- This will help us understand exactly what happens when a draft is deleted

-- IMPORTANT: Replace 'YOUR_DRAFT_ID_HERE' with an actual draft ID before running
-- This test will actually soft-delete the draft!

DO $$
DECLARE
    v_test_draft_id uuid := 'YOUR_DRAFT_ID_HERE'::uuid;  -- REPLACE THIS!
    v_before_count integer;
    v_after_count integer;
    v_before_status text;
    v_after_status text;
    v_error_msg text;
BEGIN
    RAISE NOTICE '=== TESTING DELETE FUNCTION ===';
    RAISE NOTICE 'Draft ID: %', v_test_draft_id;
    
    -- Check before
    SELECT COUNT(*), MAX(status) INTO v_before_count, v_before_status
    FROM drafts WHERE id = v_test_draft_id;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== BEFORE DELETE ===';
    RAISE NOTICE 'Draft exists: %', v_before_count > 0;
    RAISE NOTICE 'Current status: %', COALESCE(v_before_status, 'NOT FOUND');
    
    IF v_before_count = 0 THEN
        RAISE EXCEPTION 'Draft % does not exist!', v_test_draft_id;
    END IF;
    
    -- Call the delete function
    BEGIN
        PERFORM rpc_delete_draft(v_test_draft_id);
        RAISE NOTICE '';
        RAISE NOTICE 'Function call completed without exceptions';
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_error_msg = MESSAGE_TEXT;
        RAISE WARNING 'Function call failed with error: %', v_error_msg;
        RAISE;
    END;
    
    -- Wait a tiny bit (to ensure any triggers have completed)
    PERFORM pg_sleep(0.1);
    
    -- Check after
    SELECT COUNT(*), MAX(status) INTO v_after_count, v_after_status
    FROM drafts WHERE id = v_test_draft_id;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== AFTER DELETE ===';
    RAISE NOTICE 'Draft exists: %', v_after_count > 0;
    RAISE NOTICE 'New status: %', COALESCE(v_after_status, 'NOT FOUND');
    
    -- Diagnose the result
    RAISE NOTICE '';
    RAISE NOTICE '=== DIAGNOSIS ===';
    IF v_after_count = 0 THEN
        RAISE WARNING '❌ DRAFT WAS HARD-DELETED! This should not happen.';
        RAISE WARNING 'Possible causes:';
        RAISE WARNING '  1. A trigger is deleting the draft';
        RAISE WARNING '  2. A foreign key CASCADE is deleting the draft';
        RAISE WARNING '  3. Something else is calling DELETE directly';
    ELSIF v_after_status = 'deleted' THEN
        RAISE NOTICE '✅ SUCCESS: Draft was soft-deleted correctly (status = deleted)';
    ELSIF v_after_status = v_before_status THEN
        RAISE WARNING '⚠️  WARNING: Draft still exists but status unchanged (status = %)', v_after_status;
        RAISE WARNING 'The UPDATE may have failed silently (check RLS policies)';
    ELSE
        RAISE WARNING '⚠️  UNEXPECTED: Draft still exists but status is % (expected: deleted)', v_after_status;
    END IF;
END $$;




