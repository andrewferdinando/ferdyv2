-- Create pending_team_invitations table to store team invite data
CREATE TABLE IF NOT EXISTS pending_team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  group_id UUID NOT NULL,
  group_role TEXT NOT NULL,
  brand_assignments JSONB,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_pending_team_invitations_email ON pending_team_invitations(email);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_pending_team_invitations_status ON pending_team_invitations(status);

-- Enable RLS
ALTER TABLE pending_team_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything
CREATE POLICY "Service role can manage pending_team_invitations"
  ON pending_team_invitations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
