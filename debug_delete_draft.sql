-- Debug script for draft deletion issue
-- This will help us understand why drafts are being hard-deleted

-- 1. Check for triggers on drafts table that might delete drafts
SELECT 
    t.tgname AS trigger_name,
    pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' 
  AND c.relname = 'drafts'
  AND NOT t.tgisinternal;

-- 2. Check RLS policies on drafts table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'drafts';

-- 3. Check if function exists and show its definition
SELECT 
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'rpc_delete_draft';

-- 4. Check foreign key constraints that reference drafts
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND (ccu.table_name = 'drafts' OR tc.table_name = 'drafts')
    AND tc.table_schema = 'public';

-- 5. Test the function with a draft ID (replace 'YOUR_DRAFT_ID' with an actual draft ID)
-- This will show what the function actually does
DO $$
DECLARE
    v_test_draft_id uuid;
    v_before_status text;
    v_after_status text;
    v_exists_before boolean;
    v_exists_after boolean;
BEGIN
    -- Get a draft ID for testing (replace with an actual draft ID you want to test with)
    -- For now, just show a sample - DON'T RUN THIS ON A REAL DRAFT!
    RAISE NOTICE '=== DELETE DRAFT FUNCTION TEST ===';
    RAISE NOTICE 'Replace v_test_draft_id with a real draft ID to test';
    RAISE NOTICE 'This test will NOT actually delete anything - it just shows what WOULD happen';
    
    -- Uncomment and replace with a real draft ID to test:
    -- v_test_draft_id := 'YOUR_DRAFT_ID_HERE'::uuid;
    -- 
    -- SELECT status, EXISTS(SELECT 1 FROM drafts WHERE id = v_test_draft_id) 
    -- INTO v_before_status, v_exists_before
    -- FROM drafts WHERE id = v_test_draft_id;
    -- 
    -- RAISE NOTICE 'Before: draft exists = %, status = %', v_exists_before, v_before_status;
    -- 
    -- PERFORM rpc_delete_draft(v_test_draft_id);
    -- 
    -- SELECT status, EXISTS(SELECT 1 FROM drafts WHERE id = v_test_draft_id) 
    -- INTO v_after_status, v_exists_after
    -- FROM drafts WHERE id = v_test_draft_id;
    -- 
    -- RAISE NOTICE 'After: draft exists = %, status = %', v_exists_after, v_after_status;
END $$;

