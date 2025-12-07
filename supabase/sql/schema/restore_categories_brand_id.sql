-- Restore brand_id to categories table
-- Categories should be brand-specific, not global

-- Step 1: Add brand_id column back to categories table
ALTER TABLE categories ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES brands(id) ON DELETE CASCADE;

-- Step 2: Drop the global RLS policy if it exists
DROP POLICY IF EXISTS "Users can view all categories" ON categories;

-- Step 3: Create brand-specific RLS policies
DROP POLICY IF EXISTS "Users can view categories for brands they're members of" ON categories;
DROP POLICY IF EXISTS "Users can manage categories for brands they have edit access to" ON categories;

-- Policy: Users can view categories for brands they're members of
CREATE POLICY "Users can view categories for brands they're members of" 
ON categories 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM brand_memberships
    WHERE brand_memberships.brand_id = categories.brand_id
    AND brand_memberships.user_id = auth.uid()
  )
);

-- Policy: Admins and Super Admin can insert categories for their brands
CREATE POLICY "Admins can create categories for their brands" 
ON categories 
FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM brand_memberships
    WHERE brand_memberships.brand_id = categories.brand_id
    AND brand_memberships.user_id = auth.uid()
    AND brand_memberships.role IN ('admin', 'super_admin')
  )
);

-- Policy: Admins and Super Admin can update categories for their brands
CREATE POLICY "Admins can update categories for their brands" 
ON categories 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM brand_memberships
    WHERE brand_memberships.brand_id = categories.brand_id
    AND brand_memberships.user_id = auth.uid()
    AND brand_memberships.role IN ('admin', 'super_admin')
  )
);

-- Policy: Admins and Super Admin can delete categories for their brands
CREATE POLICY "Admins can delete categories for their brands" 
ON categories 
FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM brand_memberships
    WHERE brand_memberships.brand_id = categories.brand_id
    AND brand_memberships.user_id = auth.uid()
    AND brand_memberships.role IN ('admin', 'super_admin')
  )
);

