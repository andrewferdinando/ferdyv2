-- Add subscription_status column to groups table
ALTER TABLE groups 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'incomplete';

-- Add index for filtering by status
CREATE INDEX IF NOT EXISTS idx_groups_subscription_status ON groups(subscription_status);

-- Add comment
COMMENT ON COLUMN groups.subscription_status IS 'Cached Stripe subscription status: incomplete, active, past_due, canceled, etc.';
