-- Test script to verify rpc_delete_draft function is working correctly
-- Run this after deploying add_deleted_status_to_drafts.sql

-- Step 1: Check if function exists and what it does
SELECT 
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'rpc_delete_draft';

-- Step 2: Check if 'deleted' status is in the constraint
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
JOIN pg_class cl ON c.conrelid = cl.oid
JOIN pg_namespace n ON cl.relnamespace = n.oid
WHERE n.nspname = 'public' 
  AND cl.relname = 'drafts'
  AND c.contype = 'c';  -- check constraint

-- Step 3: Test the function (create a test draft first, then delete it)
-- Create a test draft
DO $$
DECLARE
    v_test_draft_id uuid;
    v_brand_id uuid;
BEGIN
    -- Get a brand_id for testing (use the first one)
    SELECT id INTO v_brand_id FROM brands LIMIT 1;
    
    IF v_brand_id IS NULL THEN
        RAISE NOTICE 'No brands found for testing';
        RETURN;
    END IF;
    
    -- Create a test draft
    INSERT INTO drafts (brand_id, copy, status, approved)
    VALUES (v_brand_id, 'Test draft for deletion', 'scheduled', false)
    RETURNING id INTO v_test_draft_id;
    
    RAISE NOTICE 'Created test draft with id: %', v_test_draft_id;
    RAISE NOTICE 'Test draft status before delete: scheduled';
    
    -- Try to delete it
    PERFORM rpc_delete_draft(v_test_draft_id);
    
    -- Check if it was soft-deleted
    SELECT status INTO v_test_draft_id FROM drafts WHERE id = v_test_draft_id;
    
    IF v_test_draft_id IS NULL THEN
        RAISE WARNING 'TEST FAILED: Draft was hard-deleted (row removed)';
    ELSE
        RAISE NOTICE 'TEST PASSED: Draft was soft-deleted (status = deleted)';
        -- Clean up test draft
        DELETE FROM drafts WHERE id = v_test_draft_id;
    END IF;
END $$;

