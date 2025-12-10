-- Create brand_audit_log table for tracking brand-related actions
CREATE TABLE IF NOT EXISTS brand_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- e.g., 'created', 'removed', 'updated', 'restored'
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB, -- Flexible field for storing additional context
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_brand_audit_log_brand_id ON brand_audit_log(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_audit_log_user_id ON brand_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_audit_log_timestamp ON brand_audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_brand_audit_log_action ON brand_audit_log(action);

-- Add RLS (Row Level Security) policies
ALTER TABLE brand_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view audit logs for brands in their group
CREATE POLICY "Users can view audit logs for their group's brands"
  ON brand_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM brands b
      JOIN group_memberships gm ON gm.group_id = b.group_id
      WHERE b.id = brand_audit_log.brand_id
        AND gm.user_id = auth.uid()
    )
  );

-- Policy: Only authenticated users can insert audit logs (via API)
CREATE POLICY "Authenticated users can insert audit logs"
  ON brand_audit_log
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Add comment to table
COMMENT ON TABLE brand_audit_log IS 'Audit log for tracking brand-related actions (creation, removal, updates, etc.)';
COMMENT ON COLUMN brand_audit_log.action IS 'Type of action performed: created, removed, updated, restored, etc.';
COMMENT ON COLUMN brand_audit_log.metadata IS 'Additional context about the action (brand name, old/new values, Stripe details, etc.)';
