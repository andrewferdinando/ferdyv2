-- Create groups table
-- A group represents a company or agency that can own multiple brands
-- Groups have Stripe subscriptions with per-brand pricing

CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  
  -- Stripe integration
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT, -- Default price for this group
  
  -- Pricing configuration
  price_per_brand_cents INTEGER DEFAULT 8600, -- Default: $86.00 USD
  currency TEXT DEFAULT 'usd',
  negotiated_rate_cents INTEGER, -- Optional override for enterprise/custom pricing
  
  -- Tax configuration
  country_code TEXT, -- ISO country code (e.g., 'NZ', 'US')
  tax_rate DECIMAL(5,4), -- e.g., 0.15 for 15% GST
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on stripe_customer_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_groups_stripe_customer_id ON groups(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_groups_stripe_subscription_id ON groups(stripe_subscription_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW
  EXECUTE FUNCTION update_groups_updated_at();

-- Row Level Security (RLS)
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- Users can see groups they are members of
CREATE POLICY "Users can view their groups"
  ON groups
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_memberships
      WHERE group_memberships.group_id = groups.id
      AND group_memberships.user_id = auth.uid()
    )
  );

-- Only group owners can update group details
CREATE POLICY "Group owners can update groups"
  ON groups
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM group_memberships
      WHERE group_memberships.group_id = groups.id
      AND group_memberships.user_id = auth.uid()
      AND group_memberships.role = 'owner'
    )
  );

-- Authenticated users can create groups (for onboarding)
CREATE POLICY "Authenticated users can create groups"
  ON groups
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

COMMENT ON TABLE groups IS 'Top-level entity representing a company or agency that owns brands';
COMMENT ON COLUMN groups.stripe_customer_id IS 'Stripe customer ID for billing';
COMMENT ON COLUMN groups.stripe_subscription_id IS 'Stripe subscription ID for per-brand billing';
COMMENT ON COLUMN groups.price_per_brand_cents IS 'Price per brand in cents (default $86.00 = 8600 cents)';
COMMENT ON COLUMN groups.negotiated_rate_cents IS 'Optional custom pricing override for enterprise customers';
COMMENT ON COLUMN groups.tax_rate IS 'Tax rate for this group (e.g., 0.15 for 15% NZ GST)';
