-- Complete fix for Storage RLS policies
-- This will allow both listing bucket contents and accessing files

-- Drop existing policies
DROP POLICY IF EXISTS "ferdy upload" ON storage.objects;

-- Create a comprehensive policy that allows:
-- 1. Listing bucket contents (for list() operations)
-- 2. Accessing files (for createSignedUrl() operations)
-- 3. Uploading files (for upload operations)

CREATE POLICY "ferdy upload" ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'ferdy-assets'::text 
  AND (
    -- Allow access to originals/ folder if user is a member of any brand
    -- that has assets in the originals/ folder
    name LIKE 'originals/%' 
    AND EXISTS (
      SELECT 1 
      FROM assets a
      JOIN brand_memberships bm ON bm.brand_id = a.brand_id
      WHERE a.storage_path = name
      AND bm.user_id = auth.uid()
    )
  )
);

-- Alternative simpler policy for testing (temporarily)
-- This allows all authenticated users to access the ferdy-assets bucket
-- Uncomment this and comment out the above if you want to test

-- DROP POLICY IF EXISTS "ferdy upload" ON storage.objects;
-- CREATE POLICY "ferdy upload" ON storage.objects
-- FOR ALL
-- TO authenticated
-- USING (bucket_id = 'ferdy-assets'::text);

-- Also check if there are any other policies that might be interfering
-- You can run this query to see all policies on storage.objects:
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

