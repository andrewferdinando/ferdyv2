-- Update brand_memberships to enforce group membership requirement
-- Users must be members of a brand's group before they can have brand-level access

-- Add a check constraint to ensure users are group members
-- Note: This is enforced at the application level and via RLS policies
-- We'll add a database function to validate this

CREATE OR REPLACE FUNCTION check_user_in_brand_group()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user is a member of the brand's group
  IF NOT EXISTS (
    SELECT 1
    FROM brands b
    JOIN group_memberships gm ON gm.group_id = b.group_id
    WHERE b.id = NEW.brand_id
    AND gm.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'User must be a member of the brand''s group before being added to the brand';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce group membership
DROP TRIGGER IF EXISTS enforce_group_membership_on_brand_membership ON brand_memberships;

CREATE TRIGGER enforce_group_membership_on_brand_membership
  BEFORE INSERT OR UPDATE ON brand_memberships
  FOR EACH ROW
  EXECUTE FUNCTION check_user_in_brand_group();

-- Update RLS policies for brand_memberships to be group-aware

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view brand memberships" ON brand_memberships;
DROP POLICY IF EXISTS "Users can create brand memberships" ON brand_memberships;
DROP POLICY IF EXISTS "Users can update brand memberships" ON brand_memberships;
DROP POLICY IF EXISTS "Users can delete brand memberships" ON brand_memberships;

-- Users can view brand memberships if they are in the brand's group
CREATE POLICY "Users can view brand memberships in their groups"
  ON brand_memberships
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM brands b
      JOIN group_memberships gm ON gm.group_id = b.group_id
      WHERE b.id = brand_memberships.brand_id
      AND gm.user_id = auth.uid()
    )
  );

-- Group owners and admins can create brand memberships
CREATE POLICY "Group owners and admins can create brand memberships"
  ON brand_memberships
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM brands b
      JOIN group_memberships gm ON gm.group_id = b.group_id
      WHERE b.id = brand_memberships.brand_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('owner', 'admin')
    )
    OR
    -- Allow self-assignment during onboarding
    (
      auth.uid() = brand_memberships.user_id
      AND auth.uid() IS NOT NULL
    )
  );

-- Group owners and admins can update brand memberships
CREATE POLICY "Group owners and admins can update brand memberships"
  ON brand_memberships
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM brands b
      JOIN group_memberships gm ON gm.group_id = b.group_id
      WHERE b.id = brand_memberships.brand_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('owner', 'admin')
    )
  );

-- Group owners and admins can delete brand memberships
CREATE POLICY "Group owners and admins can delete brand memberships"
  ON brand_memberships
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM brands b
      JOIN group_memberships gm ON gm.group_id = b.group_id
      WHERE b.id = brand_memberships.brand_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('owner', 'admin')
    )
  );

COMMENT ON FUNCTION check_user_in_brand_group() IS 'Ensures users are members of a brand''s group before being added to the brand';
