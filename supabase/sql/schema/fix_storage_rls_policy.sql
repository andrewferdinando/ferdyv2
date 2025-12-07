-- Fix RLS policy for storage.objects to work with current file structure
-- Files are stored at: originals/assetId.ext
-- Need to allow access for brand members

-- First, let's see what the current policy looks like
-- The current policy: user_is_brand_member(storage_path_brand_id(name))
-- This fails because storage_path_brand_id() can't extract brandId from "originals/assetId.ext"

-- New policy: Allow access to originals/ folder for authenticated users
-- who are members of the brand (we'll get brandId from the assets table)

-- Drop the existing policy
DROP POLICY IF EXISTS "ferdy upload" ON storage.objects;

-- Create a new policy that works with the current structure
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

-- Alternative simpler policy (if the above is too complex):
-- This allows all authenticated users to access the ferdy-assets bucket
-- You can use this temporarily to test if RLS is the issue

-- DROP POLICY IF EXISTS "ferdy upload" ON storage.objects;
-- CREATE POLICY "ferdy upload" ON storage.objects
-- FOR ALL
-- TO authenticated
-- USING (bucket_id = 'ferdy-assets'::text);
