-- Add group_id to brands table
-- This links each brand to a group (company/agency)

-- Add the column (nullable initially for existing brands)
ALTER TABLE brands
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE CASCADE;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_brands_group_id ON brands(group_id);

-- Update RLS policies to be group-aware

-- Drop existing brand RLS policies (we'll recreate them)
DROP POLICY IF EXISTS "Users can view brands they are members of" ON brands;
DROP POLICY IF EXISTS "Users can update brands they are members of" ON brands;
DROP POLICY IF EXISTS "Users can insert brands" ON brands;
DROP POLICY IF EXISTS "Users can delete brands they own" ON brands;

-- Users can view brands if they are members of the brand's group
CREATE POLICY "Users can view brands in their groups"
  ON brands
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_memberships
      WHERE group_memberships.group_id = brands.group_id
      AND group_memberships.user_id = auth.uid()
    )
  );

-- Group owners and admins can update brands
CREATE POLICY "Group owners and admins can update brands"
  ON brands
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM group_memberships
      WHERE group_memberships.group_id = brands.group_id
      AND group_memberships.user_id = auth.uid()
      AND group_memberships.role IN ('owner', 'admin')
    )
  );

-- Group owners and admins can create brands
CREATE POLICY "Group owners and admins can create brands"
  ON brands
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_memberships
      WHERE group_memberships.group_id = brands.group_id
      AND group_memberships.user_id = auth.uid()
      AND group_memberships.role IN ('owner', 'admin')
    )
    OR
    -- Allow brand creation during onboarding (when creating first brand for new group)
    (
      auth.uid() IS NOT NULL
      AND brands.group_id IS NOT NULL
    )
  );

-- Group owners can delete brands
CREATE POLICY "Group owners can delete brands"
  ON brands
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM group_memberships
      WHERE group_memberships.group_id = brands.group_id
      AND group_memberships.user_id = auth.uid()
      AND group_memberships.role = 'owner'
    )
  );

COMMENT ON COLUMN brands.group_id IS 'The group (company/agency) that owns this brand';
