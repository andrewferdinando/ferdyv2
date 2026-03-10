-- Allow users to update their own profile row.
-- Previously only a SELECT policy existed, so name changes from the
-- profile page were silently rejected by RLS.

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
