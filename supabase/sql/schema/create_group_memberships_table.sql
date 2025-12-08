-- Create group_memberships table
-- Links users to groups with specific roles

CREATE TABLE IF NOT EXISTS group_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Role within the group
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'billing', 'member')),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure a user can only have one role per group
  UNIQUE(group_id, user_id)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_group_memberships_group_id ON group_memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_user_id ON group_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_role ON group_memberships(role);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_group_memberships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER group_memberships_updated_at
  BEFORE UPDATE ON group_memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_group_memberships_updated_at();

-- Row Level Security (RLS)
ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;

-- Users can see memberships for groups they belong to
CREATE POLICY "Users can view group memberships"
  ON group_memberships
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_memberships gm
      WHERE gm.group_id = group_memberships.group_id
      AND gm.user_id = auth.uid()
    )
  );

-- Group owners and admins can create memberships (invite users)
CREATE POLICY "Group owners and admins can create memberships"
  ON group_memberships
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_memberships gm
      WHERE gm.group_id = group_memberships.group_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('owner', 'admin')
    )
    OR
    -- Allow self-assignment during onboarding (when creating first group)
    (
      auth.uid() = group_memberships.user_id
      AND group_memberships.role = 'owner'
      AND NOT EXISTS (
        SELECT 1 FROM group_memberships gm2
        WHERE gm2.group_id = group_memberships.group_id
      )
    )
  );

-- Group owners and admins can update memberships
CREATE POLICY "Group owners and admins can update memberships"
  ON group_memberships
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM group_memberships gm
      WHERE gm.group_id = group_memberships.group_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('owner', 'admin')
    )
  );

-- Group owners and admins can delete memberships
CREATE POLICY "Group owners and admins can delete memberships"
  ON group_memberships
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM group_memberships gm
      WHERE gm.group_id = group_memberships.group_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('owner', 'admin')
    )
  );

COMMENT ON TABLE group_memberships IS 'Links users to groups with specific roles (owner, admin, billing, member)';
COMMENT ON COLUMN group_memberships.role IS 'User role within the group: owner (full control), admin (manage users/brands), billing (view billing only), member (basic access)';
