-- Add terms_accepted_at column to track when group owner accepted T&Cs
ALTER TABLE groups ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
