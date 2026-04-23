-- Partner Programme: four new reporting tables + nullable FK on groups.
-- All tables are RLS-locked to service_role only. Public registration and
-- super-admin reads/writes both go through the API using the service-role key.

-- 1. partners: one row per person who has registered for the partner programme
CREATE TABLE partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','terminated')),
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  country text NOT NULL,
  trading_name text NOT NULL,
  entity_type text NOT NULL,
  company_number text,
  business_address text NOT NULL,
  gst_registered boolean NOT NULL DEFAULT false,
  gst_number text,
  bank_account_name text NOT NULL,
  bank_account_number_encrypted text NOT NULL,
  wise_email_encrypted text,
  tcs_accepted_at timestamptz NOT NULL,
  stripe_promotion_code_id text,
  discount_code_display text,
  discount_code_notes text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX partners_status_idx ON partners (status);

-- 2. partner_enquiries: one row per warm intro the partner makes to a prospect
CREATE TABLE partner_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  enquiry_date date NOT NULL,
  prospect_company text NOT NULL,
  prospect_contact_name text NOT NULL,
  prospect_email text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_progress','converted','expired','lost')),
  group_id uuid REFERENCES groups(id) ON DELETE SET NULL,
  converted_at timestamptz,
  expires_at date GENERATED ALWAYS AS (enquiry_date + INTERVAL '60 days') STORED,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX partner_enquiries_partner_idx ON partner_enquiries (partner_id);
CREATE INDEX partner_enquiries_status_idx ON partner_enquiries (status);
CREATE INDEX partner_enquiries_group_idx ON partner_enquiries (group_id);

-- A converted enquiry is the sole owner of that group's attribution.
CREATE UNIQUE INDEX partner_enquiries_converted_group_unique
  ON partner_enquiries (group_id)
  WHERE status = 'converted';

-- 3. partner_commissions: one row per paid invoice linked to a partner sale
CREATE TABLE partner_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
  enquiry_id uuid NOT NULL REFERENCES partner_enquiries(id) ON DELETE RESTRICT,
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
  stripe_invoice_id text NOT NULL,
  stripe_credit_note_id text,
  invoice_paid_at timestamptz NOT NULL,
  customer_net_cents integer NOT NULL,
  commission_rate numeric(5,4) NOT NULL DEFAULT 0.20,
  commission_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'nzd',
  payout_id uuid,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid_out','voided')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Idempotency: the same invoice cannot create two commission rows.
-- Offsetting (negative) rows created by credit notes are keyed on the credit note id.
CREATE UNIQUE INDEX partner_commissions_invoice_unique
  ON partner_commissions (stripe_invoice_id)
  WHERE stripe_credit_note_id IS NULL;

CREATE UNIQUE INDEX partner_commissions_credit_note_unique
  ON partner_commissions (stripe_credit_note_id)
  WHERE stripe_credit_note_id IS NOT NULL;

CREATE INDEX partner_commissions_partner_status_idx ON partner_commissions (partner_id, status);
CREATE INDEX partner_commissions_payout_idx ON partner_commissions (payout_id);

-- 4. partner_payouts: one row per BCTI issued to a partner
CREATE SEQUENCE partner_bcti_number_seq START 1;

CREATE TABLE partner_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
  period_start date NOT NULL,
  period_end date NOT NULL,
  commission_subtotal_cents integer NOT NULL DEFAULT 0,
  gst_cents integer NOT NULL DEFAULT 0,
  total_cents integer NOT NULL DEFAULT 0,
  bcti_number text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','issued','sent','paid','rolled_forward')),
  issued_at timestamptz,
  sent_at timestamptz,
  sent_to_email text,
  paid_at timestamptz,
  payment_reference text,
  pdf_storage_path text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX partner_payouts_partner_idx ON partner_payouts (partner_id);
CREATE INDEX partner_payouts_status_idx ON partner_payouts (status);

-- Wire payout_id FK on commissions now that the payouts table exists.
ALTER TABLE partner_commissions
  ADD CONSTRAINT partner_commissions_payout_id_fkey
  FOREIGN KEY (payout_id) REFERENCES partner_payouts(id) ON DELETE SET NULL;

-- 5. groups.partner_enquiry_id — nullable FK for attribution.
-- Nothing in onboarding/billing/draft-gen/publishing reads this column,
-- so the addition is a no-op for every existing flow.
ALTER TABLE groups
  ADD COLUMN partner_enquiry_id uuid REFERENCES partner_enquiries(id) ON DELETE SET NULL;

CREATE INDEX groups_partner_enquiry_idx ON groups (partner_enquiry_id)
  WHERE partner_enquiry_id IS NOT NULL;

-- 6. updated_at trigger for partner tables.
CREATE OR REPLACE FUNCTION set_updated_at_partner_tables()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER partners_updated_at
  BEFORE UPDATE ON partners
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_partner_tables();

CREATE TRIGGER partner_enquiries_updated_at
  BEFORE UPDATE ON partner_enquiries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_partner_tables();

-- 7. RLS: service-role only on all four new tables.
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON partners
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON partner_enquiries
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON partner_commissions
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON partner_payouts
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- 8. Private storage bucket for BCTI PDFs (service-role only).
INSERT INTO storage.buckets (id, name, public)
VALUES ('partner-bctis', 'partner-bctis', false)
ON CONFLICT (id) DO NOTHING;
