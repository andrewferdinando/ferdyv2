-- Create cron_logs table for tracking cron job executions
-- No RLS needed — accessed only via supabaseAdmin from API routes

CREATE TABLE IF NOT EXISTS cron_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cron_path text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  summary jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cron_logs_path_started ON cron_logs (cron_path, started_at DESC);
