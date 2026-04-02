-- Add is_test_user flag to profiles table
ALTER TABLE profiles ADD COLUMN is_test_user boolean NOT NULL DEFAULT false;

-- Backfill: flag existing test users matching andrew+*@adhoc.help
UPDATE profiles
SET is_test_user = true
FROM auth.users
WHERE profiles.user_id = auth.users.id
  AND auth.users.email LIKE 'andrew+%@adhoc.help';

-- Partial index for efficient test user queries
CREATE INDEX idx_profiles_test_users ON profiles (user_id) WHERE is_test_user = true;
