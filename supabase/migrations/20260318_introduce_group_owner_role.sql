-- Introduce 'owner' as a distinct group role.
-- For each group, promote the earliest admin (by created_at) to 'owner'.
-- The DB constraint on group_memberships.role already allows 'owner'.
-- This must run AFTER the application code has been updated to accept 'owner'
-- in all role checks, to avoid locking anyone out.

-- Step 1: For each group, set the earliest admin to 'owner'
WITH earliest_admin AS (
  SELECT DISTINCT ON (group_id) id, group_id, user_id
  FROM group_memberships
  WHERE role = 'admin'
  ORDER BY group_id, created_at ASC
)
UPDATE group_memberships gm
SET role = 'owner'
FROM earliest_admin ea
WHERE gm.id = ea.id;

-- Step 2: Ensure RLS policies include 'owner' where they check for 'admin'.
-- The existing policies in create_group_memberships_table.sql already use
-- IN ('owner', 'admin'), so no RLS changes are needed.

-- Step 3: Update the groups table RLS policy if it only checks for 'owner'
-- (00_groups_system_migration_fixed.sql already has role = 'owner' checks)
-- No changes needed — 'owner' is already recognized in RLS.
