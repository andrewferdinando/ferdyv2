-- Add RLS policy for global categories
-- Since categories are now global, allow all authenticated users to view them

-- Enable RLS on categories table (if not already enabled)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated users to view categories
CREATE POLICY "Users can view all categories" ON categories 
FOR SELECT 
TO authenticated 
USING (true);

-- Optional: Create policy to allow super admins to manage categories
-- CREATE POLICY "Super admins can manage categories" ON categories 
-- FOR ALL 
-- TO authenticated 
-- USING (
--   EXISTS (
--     SELECT 1 FROM profiles 
--     WHERE profiles.id = auth.uid() 
--     AND profiles.role = 'super_admin'
--   )
-- );
