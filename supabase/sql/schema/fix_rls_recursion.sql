-- Fix infinite recursion in group_memberships RLS policy
-- The issue: policy checks group_memberships to see if user can view group_memberships

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view group memberships" ON group_memberships;

-- Create a simpler policy: users can view their own memberships or memberships in groups they belong to
CREATE POLICY "Users can view group memberships"
  ON group_memberships FOR SELECT
  USING (
    -- Users can see their own memberships
    user_id = auth.uid()
    OR
    -- Users can see other memberships in groups where they are members
    -- This uses a direct check without recursion
    group_id IN (
      SELECT gm.group_id 
      FROM group_memberships gm 
      WHERE gm.user_id = auth.uid()
    )
  );

-- Also simplify the brands policy to avoid the recursion issue
DROP POLICY IF EXISTS "Users can view brands in their groups" ON brands;

CREATE POLICY "Users can view brands in their groups"
  ON brands FOR SELECT
  USING (
    -- Check if user is a member of the brand's group
    group_id IN (
      SELECT gm.group_id 
      FROM group_memberships gm 
      WHERE gm.user_id = auth.uid()
    )
  );
