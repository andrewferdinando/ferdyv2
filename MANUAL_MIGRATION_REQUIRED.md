# Manual SQL Migration Required

## Overview
This deployment includes a database migration that must be run manually in the Supabase SQL Editor.

## What This Migration Does

1. **Fixes the Add Brand Error** - Updates `rpc_create_brand_with_admin` function to include `group_id`
2. **Simplifies Role Structure** - Converts all `owner` roles to `admin` roles
3. **Updates Documentation** - Adds SQL comments explaining the role system

## How to Apply

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your Ferdy project
3. Click "SQL Editor" in the left sidebar
4. Click "New Query"

### Step 2: Copy the Migration SQL
Copy the entire contents of:
```
/supabase/migrations/20250109_simplify_roles_and_fix_rpc.sql
```

### Step 3: Run the Migration
1. Paste the SQL into the editor
2. Click "Run" or press Cmd/Ctrl + Enter
3. Wait for confirmation that it executed successfully

### Step 4: Verify
After running, verify:
- [ ] No `owner` roles remain in `profiles` table
- [ ] No `owner` roles remain in `group_memberships` table  
- [ ] No `owner` roles remain in `brand_memberships` table
- [ ] The `rpc_create_brand_with_admin` function exists and has the updated code

You can verify with these queries:
```sql
-- Check for any remaining 'owner' roles
SELECT 'profiles' as table_name, COUNT(*) as owner_count 
FROM profiles WHERE role = 'owner'
UNION ALL
SELECT 'group_memberships', COUNT(*) 
FROM group_memberships WHERE role = 'owner'
UNION ALL
SELECT 'brand_memberships', COUNT(*) 
FROM brand_memberships WHERE role = 'owner';

-- Should return 0 for all tables

-- Check the RPC function exists
SELECT routine_name, routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'rpc_create_brand_with_admin';
```

## What Changes After Migration

### For Users
- All users with `owner` role become `admin` role
- No change in permissions (admin has same access as owner had)
- Cleaner, simpler role system

### For the App
- "Add Brand" feature will work correctly
- Role checks are simplified and consistent
- Super Admin nav item only visible to you (Andrew)

## Rollback (If Needed)

If you need to rollback:
```sql
-- This would restore the old RPC function without group_id
-- But you'll still have the add brand error
-- Better to fix forward by debugging the migration
```

## Support

If the migration fails or you encounter issues:
1. Check the error message in Supabase SQL Editor
2. Verify you're connected to the correct database
3. Ensure you have admin permissions in Supabase
4. Contact support if needed

## Timeline

- **Code Deployed**: Automatically via Vercel when you pushed to main
- **Migration Required**: Manual - run at your convenience
- **Impact**: Add Brand feature won't work until migration is run

## Migration File Location

The migration SQL file is located at:
```
/home/ubuntu/ferdy-app/supabase/migrations/20250109_simplify_roles_and_fix_rpc.sql
```

You can also view it on GitHub after the deployment.
