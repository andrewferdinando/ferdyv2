-- ⚠️ WARNING: This script will DELETE all brands except the specified one
-- and ALL related data (drafts, assets, schedule rules, etc.)
-- 
-- Brand to keep: 73210d3e-9ca1-4e8c-a15d-13cbe045bdfe
-- User to keep: andrew@adhoc.help
--
-- BACKUP YOUR DATABASE BEFORE RUNNING THIS!
--
-- This script is designed to be run in Supabase SQL Editor or via psql

-- Start a transaction so we can rollback if something goes wrong
BEGIN;

-- Store the brand ID and user email we want to keep
DO $$
DECLARE
    keep_brand_id UUID := '73210d3e-9ca1-4e8c-a15d-13cbe045bdfe';
    keep_user_email TEXT := 'andrew@adhoc.help';
    keep_user_id UUID;
    deleted_brands_count INT;
BEGIN
    -- Get the user ID for the email we want to keep
    SELECT id INTO keep_user_id
    FROM auth.users
    WHERE email = keep_user_email;
    
    IF keep_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found!', keep_user_email;
    END IF;
    
    RAISE NOTICE '======================';
    RAISE NOTICE 'User to keep: % (ID: %)', keep_user_email, keep_user_id;
    RAISE NOTICE '======================';
    
    -- Show what we're about to delete (for safety)
    RAISE NOTICE 'DELETION PREVIEW:';
    
    SELECT COUNT(*) INTO deleted_brands_count FROM brands WHERE id != keep_brand_id;
    RAISE NOTICE '  Brands to delete: %', deleted_brands_count;
    
    RAISE NOTICE '  Drafts to delete: %', (SELECT COUNT(*) FROM drafts WHERE brand_id != keep_brand_id);
    RAISE NOTICE '  Post jobs to delete: %', (SELECT COUNT(*) FROM post_jobs WHERE brand_id != keep_brand_id);
    RAISE NOTICE '  Assets to delete: %', (SELECT COUNT(*) FROM assets WHERE brand_id != keep_brand_id);
    RAISE NOTICE '  Schedule rules to delete: %', (SELECT COUNT(*) FROM schedule_rules WHERE brand_id != keep_brand_id);
    RAISE NOTICE '  Subcategories to delete: %', (SELECT COUNT(*) FROM subcategories WHERE brand_id != keep_brand_id);
    RAISE NOTICE '  Team members to remove from kept brand: %', (SELECT COUNT(*) FROM brand_memberships WHERE brand_id = keep_brand_id AND user_id != keep_user_id);
    
    RAISE NOTICE '======================';
    RAISE NOTICE 'Starting deletion...';
    RAISE NOTICE '======================';
    
    -- Delete in order of dependencies (children first, parents last)
    -- Based on actual schema tables with brand_id column
    
    -- 1. Delete publishes (published posts)
    DELETE FROM publishes WHERE brand_id != keep_brand_id;
    RAISE NOTICE '✓ Deleted publishes';
    
    -- 2. Delete post_jobs (linked to drafts)
    DELETE FROM post_jobs WHERE brand_id != keep_brand_id;
    RAISE NOTICE '✓ Deleted post_jobs';
    
    -- 3. Delete runs (push to drafts history)
    DELETE FROM runs WHERE brand_id != keep_brand_id;
    RAISE NOTICE '✓ Deleted runs';
    
    -- 4. Delete drafts
    DELETE FROM drafts WHERE brand_id != keep_brand_id;
    RAISE NOTICE '✓ Deleted drafts';
    
    -- 5. Delete asset_tags
    DELETE FROM asset_tags WHERE brand_id != keep_brand_id;
    RAISE NOTICE '✓ Deleted asset_tags';
    
    -- 6. Delete assets
    DELETE FROM assets WHERE brand_id != keep_brand_id;
    RAISE NOTICE '✓ Deleted assets';
    
    -- 7. Delete tags
    DELETE FROM tags WHERE brand_id != keep_brand_id;
    RAISE NOTICE '✓ Deleted tags';
    
    -- 8. Delete schedule_rules
    DELETE FROM schedule_rules WHERE brand_id != keep_brand_id;
    RAISE NOTICE '✓ Deleted schedule_rules';
    
    -- 9. Delete subcategories (categories)
    DELETE FROM subcategories WHERE brand_id != keep_brand_id;
    RAISE NOTICE '✓ Deleted subcategories';
    
    -- 10. Delete categories (if different from subcategories)
    DELETE FROM categories WHERE brand_id != keep_brand_id;
    RAISE NOTICE '✓ Deleted categories';
    
    -- 11. Delete content_preferences
    DELETE FROM content_preferences WHERE brand_id != keep_brand_id;
    RAISE NOTICE '✓ Deleted content_preferences';
    
    -- 12. Delete social_accounts
    DELETE FROM social_accounts WHERE brand_id != keep_brand_id;
    RAISE NOTICE '✓ Deleted social_accounts';
    
    -- 13. Delete brand_integrations
    DELETE FROM brand_integrations WHERE brand_id != keep_brand_id;
    RAISE NOTICE '✓ Deleted brand_integrations';
    
    -- 14. Delete brand_post_information
    DELETE FROM brand_post_information WHERE brand_id != keep_brand_id;
    RAISE NOTICE '✓ Deleted brand_post_information';
    
    -- Note: schedule_cards is a VIEW, not a table - skipping
    
    -- 16. Delete brand_memberships for OTHER brands
    DELETE FROM brand_memberships WHERE brand_id != keep_brand_id;
    RAISE NOTICE '✓ Deleted brand_memberships for deleted brands';
    
    -- 17. Delete brand_memberships for KEPT brand (except the user we want to keep)
    DELETE FROM brand_memberships
    WHERE brand_id = keep_brand_id AND user_id != keep_user_id;
    RAISE NOTICE '✓ Removed other team members from kept brand';
    
    -- 18. Delete brand_invites for all brands (including kept brand)
    -- Note: brand_invites doesn't have invited_by column, so we delete all invites
    DELETE FROM brand_invites WHERE brand_id != keep_brand_id;
    RAISE NOTICE '✓ Deleted brand_invites';
    
    -- Also delete any invites for the kept brand
    DELETE FROM brand_invites WHERE brand_id = keep_brand_id;
    RAISE NOTICE '✓ Deleted invites for kept brand';
    
    -- 20. Delete brand_audit_log
    DELETE FROM brand_audit_log WHERE brand_id != keep_brand_id;
    RAISE NOTICE '✓ Deleted brand_audit_log entries';
    
    -- 21. Finally, delete the brands themselves
    DELETE FROM brands WHERE id != keep_brand_id;
    RAISE NOTICE '✓ Deleted brands';
    
    RAISE NOTICE '======================';
    RAISE NOTICE 'DELETION COMPLETE!';
    RAISE NOTICE '======================';
    RAISE NOTICE 'Kept brand: %', keep_brand_id;
    RAISE NOTICE 'Kept user: % (%)', keep_user_email, keep_user_id;
    RAISE NOTICE '======================';
END $$;

-- If everything looks good, commit the transaction
-- If you want to test first, change this to ROLLBACK
COMMIT;

-- To rollback instead (for testing):
-- ROLLBACK;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Show remaining counts
SELECT 
    'brands' as table_name,
    COUNT(*) as remaining_count
FROM brands
UNION ALL
SELECT 'drafts', COUNT(*) FROM drafts
UNION ALL
SELECT 'post_jobs', COUNT(*) FROM post_jobs
UNION ALL
SELECT 'assets', COUNT(*) FROM assets
UNION ALL
SELECT 'schedule_rules', COUNT(*) FROM schedule_rules
UNION ALL
SELECT 'subcategories', COUNT(*) FROM subcategories
UNION ALL
SELECT 'brand_memberships (all)', COUNT(*) FROM brand_memberships
UNION ALL
SELECT 'brand_memberships (kept brand)', COUNT(*) 
FROM brand_memberships
WHERE brand_id = '73210d3e-9ca1-4e8c-a15d-13cbe045bdfe'
ORDER BY table_name;

-- Show remaining team member for the kept brand
SELECT 
    bm.brand_id,
    b.name as brand_name,
    u.email as user_email,
    bm.role
FROM brand_memberships bm
JOIN brands b ON b.id = bm.brand_id
JOIN auth.users u ON u.id = bm.user_id
WHERE bm.brand_id = '73210d3e-9ca1-4e8c-a15d-13cbe045bdfe';
