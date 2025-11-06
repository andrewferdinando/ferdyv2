-- Add archived_at column to schedule_rules table for soft-deleting occurrences
-- This allows archiving specific frequency occurrences without hard deletion

ALTER TABLE schedule_rules ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Add index for efficient filtering of non-archived records
CREATE INDEX IF NOT EXISTS schedule_rules_archived_at ON schedule_rules (archived_at) WHERE archived_at IS NULL;

-- Add comment to document the column
COMMENT ON COLUMN schedule_rules.archived_at IS 'Timestamp when the occurrence was archived (soft-deleted). NULL means the occurrence is active.';

