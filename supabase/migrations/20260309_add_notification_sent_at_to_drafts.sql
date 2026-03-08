-- Add notification_sent_at to drafts to prevent duplicate publish notifications.
-- An atomic UPDATE ... WHERE notification_sent_at IS NULL ensures only one
-- concurrent process sends the email for a given draft.
ALTER TABLE drafts
ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN drafts.notification_sent_at IS
  'Timestamp when the publish/failure notification was sent. Used as an atomic guard to prevent duplicate emails from concurrent cron runs.';
