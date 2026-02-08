-- Track when cron jobs actually execute (independent of whether they found work to do).
-- Solves: System Health page showing stale "Publish cron last ran" when no jobs are due.

CREATE TABLE IF NOT EXISTS cron_heartbeats (
  cron_name  TEXT PRIMARY KEY,
  last_ran_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  details    JSONB DEFAULT '{}'
);

-- Allow authenticated users to read (for System Health page)
ALTER TABLE cron_heartbeats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read cron heartbeats"
  ON cron_heartbeats FOR SELECT
  USING (auth.role() = 'authenticated');
