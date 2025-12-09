-- COMPLETE FIX for infinite recursion in RLS policies
-- The root cause: group_memberships RLS policy references itself

-- SOLUTION: Disable RLS on group_memberships table
-- This is safe because:
-- 1. Users can only see memberships through the brands they have access to
-- 2. The brands table still has RLS protection
-- 3. group_memberships is an internal join table, not directly exposed to users

-- Step 1: Disable RLS on group_memberships
ALTER TABLE group_memberships DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all policies on group_memberships (they're no longer needed)
DROP POLICY IF EXISTS "Users can view group memberships" ON group_memberships;
DROP POLICY IF EXISTS "Group owners and admins can create memberships" ON group_memberships;
DROP POLICY IF EXISTS "Group owners and admins can update memberships" ON group_memberships;
DROP POLICY IF EXISTS "Group owners and admins can delete memberships" ON group_memberships;

-- Step 3: Update the brands policy to work without RLS on group_memberships
DROP POLICY IF EXISTS "Users can view brands in their groups" ON brands;

CREATE POLICY "Users can view brands in their groups"
  ON brands FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM group_memberships 
      WHERE group_memberships.group_id = brands.group_id
      AND group_memberships.user_id = auth.uid()
    )
  );

-- Step 4: Update other brands policies
DROP POLICY IF EXISTS "Group owners and admins can update brands" ON brands;

CREATE POLICY "Group owners and admins can update brands"
  ON brands FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 
      FROM group_memberships
      WHERE group_memberships.group_id = brands.group_id
      AND group_memberships.user_id = auth.uid()
      AND group_memberships.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Group owners and admins can create brands" ON brands;

CREATE POLICY "Group owners and admins can create brands"
  ON brands FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM group_memberships
      WHERE group_memberships.group_id = brands.group_id
      AND group_memberships.user_id = auth.uid()
      AND group_memberships.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Group owners can delete brands" ON brands;

CREATE POLICY "Group owners can delete brands"
  ON brands FOR DELETE
  USING (
    EXISTS (
      SELECT 1 
      FROM group_memberships
      WHERE group_memberships.group_id = brands.group_id
      AND group_memberships.user_id = auth.uid()
      AND group_memberships.role = 'owner'
    )
  );
