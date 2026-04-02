-- Newsletter contacts table for non-customer audience management
-- Completely separate from existing email/notification system
CREATE TABLE newsletter_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL UNIQUE,
  contact_type text NOT NULL CHECK (contact_type IN ('Prospect', 'Referrer', 'Friend')),
  resend_contact_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: only service role can access (all operations are server-side)
ALTER TABLE newsletter_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON newsletter_contacts
  FOR ALL USING (auth.role() = 'service_role');
