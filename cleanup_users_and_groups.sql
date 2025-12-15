-- ⚠️⚠️⚠️ EXTREME WARNING ⚠️⚠️⚠️
-- This script will DELETE all users, profiles, and groups except yours
-- This will PERMANENTLY DELETE user accounts from Supabase Auth
-- 
-- User to keep: andrew@adhoc.help
--
-- BACKUP YOUR DATABASE BEFORE RUNNING THIS!
-- THIS CANNOT BE UNDONE!
--
-- This script is designed to be run in Supabase SQL Editor or via psql

-- Start a transaction so we can rollback if something goes wrong
BEGIN;

-- Store the user email we want to keep
DO $$
DECLARE
    keep_user_email TEXT := 'andrew@adhoc.help';
    keep_user_id UUID;
    keep_group_id UUID;
    deleted_users_count INT;
    deleted_profiles_count INT;
    deleted_groups_count INT;
BEGIN
    -- Get the user ID for the email we want to keep
    SELECT id INTO keep_user_id
    FROM auth.users
    WHERE email = keep_user_email;
    
    IF keep_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found!', keep_user_email;
    END IF;
    
    -- Get the group ID for the user we want to keep
    SELECT group_id INTO keep_group_id
    FROM group_memberships
    WHERE user_id = keep_user_id
    LIMIT 1;
    
    IF keep_group_id IS NULL THEN
        RAISE EXCEPTION 'No group found for user %', keep_user_email;
    END IF;
    
    RAISE NOTICE '======================';
    RAISE NOTICE 'User to keep: % (ID: %)', keep_user_email, keep_user_id;
    RAISE NOTICE 'Group to keep: %', keep_group_id;
    RAISE NOTICE '======================';
    
    -- Show what we're about to delete (for safety)
    RAISE NOTICE 'DELETION PREVIEW:';
    
    SELECT COUNT(*) INTO deleted_users_count 
    FROM auth.users 
    WHERE id != keep_user_id;
    RAISE NOTICE '  Users to delete: %', deleted_users_count;
    
    SELECT COUNT(*) INTO deleted_profiles_count 
    FROM profiles 
    WHERE user_id != keep_user_id;
    RAISE NOTICE '  Profiles to delete: %', deleted_profiles_count;
    
    SELECT COUNT(*) INTO deleted_groups_count 
    FROM groups 
    WHERE id != keep_group_id;
    RAISE NOTICE '  Groups to delete: %', deleted_groups_count;
    
    RAISE NOTICE '======================';
    RAISE NOTICE 'Starting deletion...';
    RAISE NOTICE '======================';
    
    -- Delete in order of dependencies
    
    -- 1. Delete group_memberships for other groups
    DELETE FROM group_memberships
    WHERE group_id != keep_group_id;
    RAISE NOTICE '✓ Deleted group_memberships for other groups';
    
    -- 2. Delete group_memberships for kept group (except kept user)
    DELETE FROM group_memberships
    WHERE group_id = keep_group_id AND user_id != keep_user_id;
    RAISE NOTICE '✓ Deleted other users from kept group';
    
    -- 3. Delete profiles for other users
    DELETE FROM profiles
    WHERE user_id != keep_user_id;
    RAISE NOTICE '✓ Deleted % profiles', deleted_profiles_count;
    
    -- 4. Delete groups (except the one we're keeping)
    DELETE FROM groups
    WHERE id != keep_group_id;
    RAISE NOTICE '✓ Deleted % groups', deleted_groups_count;
    
    -- 5. Delete users from auth.users (Supabase Auth)
    -- This is the nuclear option - permanently deletes user accounts
    DELETE FROM auth.users
    WHERE id != keep_user_id;
    RAISE NOTICE '✓ Deleted % users from auth.users', deleted_users_count;
    
    RAISE NOTICE '======================';
    RAISE NOTICE 'DELETION COMPLETE!';
    RAISE NOTICE '======================';
    RAISE NOTICE 'Kept user: % (%)', keep_user_email, keep_user_id;
    RAISE NOTICE 'Kept group: %', keep_group_id;
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
    'auth.users' as table_name,
    COUNT(*) as remaining_count
FROM auth.users
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'groups', COUNT(*) FROM groups
UNION ALL
SELECT 'group_memberships', COUNT(*) FROM group_memberships
ORDER BY table_name;

-- Show remaining user
SELECT 
    u.id,
    u.email,
    u.created_at,
    p.full_name
FROM auth.users u
LEFT JOIN profiles p ON p.user_id = u.id;

-- Show remaining group
SELECT 
    g.id,
    g.name,
    g.created_at,
    COUNT(gm.user_id) as member_count
FROM groups g
LEFT JOIN group_memberships gm ON gm.group_id = g.id
GROUP BY g.id, g.name, g.created_at;
