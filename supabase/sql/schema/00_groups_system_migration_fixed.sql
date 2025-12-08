-- ============================================================================
-- GROUPS SYSTEM MIGRATION (FIXED)
-- This file contains all migrations for the Groups/Billing system
-- Run this in Supabase SQL Editor to apply all changes at once
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE TABLES (without RLS policies that have circular dependencies)
-- ============================================================================

-- Create groups table
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  price_per_brand_cents INTEGER DEFAULT 8600,
  currency TEXT DEFAULT 'usd',
  negotiated_rate_cents INTEGER,
  country_code TEXT,
  tax_rate DECIMAL(5,4),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_groups_stripe_customer_id ON groups(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_groups_stripe_subscription_id ON groups(stripe_subscription_id);

-- Create group_memberships table
CREATE TABLE IF NOT EXISTS group_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'billing', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_memberships_group_id ON group_memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_user_id ON group_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_role ON group_memberships(role);

-- Add group_id to brands
ALTER TABLE brands
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_brands_group_id ON brands(group_id);

-- ============================================================================
-- STEP 2: CREATE TRIGGERS AND FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS groups_updated_at ON groups;
CREATE TRIGGER groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW
  EXECUTE FUNCTION update_groups_updated_at();

CREATE OR REPLACE FUNCTION update_group_memberships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS group_memberships_updated_at ON group_memberships;
CREATE TRIGGER group_memberships_updated_at
  BEFORE UPDATE ON group_memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_group_memberships_updated_at();

CREATE OR REPLACE FUNCTION check_user_in_brand_group()
RETURNS TRIGGER AS $$
BEGIN
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

DROP TRIGGER IF EXISTS enforce_group_membership_on_brand_membership ON brand_memberships;
CREATE TRIGGER enforce_group_membership_on_brand_membership
  BEFORE INSERT OR UPDATE ON brand_memberships
  FOR EACH ROW
  EXECUTE FUNCTION check_user_in_brand_group();

-- ============================================================================
-- STEP 3: ENABLE RLS AND CREATE POLICIES
-- ============================================================================

-- Enable RLS on groups
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their groups" ON groups;
CREATE POLICY "Users can view their groups"
  ON groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_memberships
      WHERE group_memberships.group_id = groups.id
      AND group_memberships.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Group owners can update groups" ON groups;
CREATE POLICY "Group owners can update groups"
  ON groups FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM group_memberships
      WHERE group_memberships.group_id = groups.id
      AND group_memberships.user_id = auth.uid()
      AND group_memberships.role = 'owner'
    )
  );

DROP POLICY IF EXISTS "Authenticated users can create groups" ON groups;
CREATE POLICY "Authenticated users can create groups"
  ON groups FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Enable RLS on group_memberships
ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view group memberships" ON group_memberships;
CREATE POLICY "Users can view group memberships"
  ON group_memberships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_memberships gm
      WHERE gm.group_id = group_memberships.group_id
      AND gm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Group owners and admins can create memberships" ON group_memberships;
CREATE POLICY "Group owners and admins can create memberships"
  ON group_memberships FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_memberships gm
      WHERE gm.group_id = group_memberships.group_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('owner', 'admin')
    )
    OR
    (
      auth.uid() = group_memberships.user_id
      AND group_memberships.role = 'owner'
      AND NOT EXISTS (
        SELECT 1 FROM group_memberships gm2
        WHERE gm2.group_id = group_memberships.group_id
      )
    )
  );

DROP POLICY IF EXISTS "Group owners and admins can update memberships" ON group_memberships;
CREATE POLICY "Group owners and admins can update memberships"
  ON group_memberships FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM group_memberships gm
      WHERE gm.group_id = group_memberships.group_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Group owners and admins can delete memberships" ON group_memberships;
CREATE POLICY "Group owners and admins can delete memberships"
  ON group_memberships FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM group_memberships gm
      WHERE gm.group_id = group_memberships.group_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('owner', 'admin')
    )
  );

-- Update brands RLS policies
DROP POLICY IF EXISTS "Users can view brands they are members of" ON brands;
DROP POLICY IF EXISTS "Users can update brands they are members of" ON brands;
DROP POLICY IF EXISTS "Users can insert brands" ON brands;
DROP POLICY IF EXISTS "Users can delete brands they own" ON brands;
DROP POLICY IF EXISTS "Users can view brands in their groups" ON brands;
DROP POLICY IF EXISTS "Group owners and admins can update brands" ON brands;
DROP POLICY IF EXISTS "Group owners and admins can create brands" ON brands;
DROP POLICY IF EXISTS "Group owners can delete brands" ON brands;

CREATE POLICY "Users can view brands in their groups"
  ON brands FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_memberships
      WHERE group_memberships.group_id = brands.group_id
      AND group_memberships.user_id = auth.uid()
    )
  );

CREATE POLICY "Group owners and admins can update brands"
  ON brands FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM group_memberships
      WHERE group_memberships.group_id = brands.group_id
      AND group_memberships.user_id = auth.uid()
      AND group_memberships.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Group owners and admins can create brands"
  ON brands FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_memberships
      WHERE group_memberships.group_id = brands.group_id
      AND group_memberships.user_id = auth.uid()
      AND group_memberships.role IN ('owner', 'admin')
    )
    OR
    (
      auth.uid() IS NOT NULL
      AND brands.group_id IS NOT NULL
    )
  );

CREATE POLICY "Group owners can delete brands"
  ON brands FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM group_memberships
      WHERE group_memberships.group_id = brands.group_id
      AND group_memberships.user_id = auth.uid()
      AND group_memberships.role = 'owner'
    )
  );

-- Update brand_memberships RLS policies
DROP POLICY IF EXISTS "Users can view brand memberships" ON brand_memberships;
DROP POLICY IF EXISTS "Users can create brand memberships" ON brand_memberships;
DROP POLICY IF EXISTS "Users can update brand memberships" ON brand_memberships;
DROP POLICY IF EXISTS "Users can delete brand memberships" ON brand_memberships;
DROP POLICY IF EXISTS "Users can view brand memberships in their groups" ON brand_memberships;
DROP POLICY IF EXISTS "Group owners and admins can create brand memberships" ON brand_memberships;
DROP POLICY IF EXISTS "Group owners and admins can update brand memberships" ON brand_memberships;
DROP POLICY IF EXISTS "Group owners and admins can delete brand memberships" ON brand_memberships;

CREATE POLICY "Users can view brand memberships in their groups"
  ON brand_memberships FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM brands b
      JOIN group_memberships gm ON gm.group_id = b.group_id
      WHERE b.id = brand_memberships.brand_id
      AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Group owners and admins can create brand memberships"
  ON brand_memberships FOR INSERT
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
    (
      auth.uid() = brand_memberships.user_id
      AND auth.uid() IS NOT NULL
    )
  );

CREATE POLICY "Group owners and admins can update brand memberships"
  ON brand_memberships FOR UPDATE
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

CREATE POLICY "Group owners and admins can delete brand memberships"
  ON brand_memberships FOR DELETE
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

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
