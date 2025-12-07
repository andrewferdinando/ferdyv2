-- Ferdy Test Data Setup
-- Run this in Supabase SQL Editor after running the main migration

-- ========================================
-- TEST USER AND BRAND SETUP
-- ========================================

-- 1. Create a test user profile
INSERT INTO profiles (id, full_name, email, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Test User',
  'test@example.com',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 2. Create a test brand
INSERT INTO brands (id, name, timezone, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000002'::uuid,
  'Test Brand',
  'America/New_York',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 3. Create brand membership (user owns the brand)
INSERT INTO brand_memberships (id, brand_id, user_id, role, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000003'::uuid,
  '00000000-0000-0000-0000-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'owner',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 4. Create content preferences for the brand
INSERT INTO content_preferences (id, brand_id, default_aspect_ratio, allowed_aspect_ratios, tone_default, hashtag_strategy, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000004'::uuid,
  '00000000-0000-0000-0000-000000000002'::uuid,
  '1:1',
  ARRAY['1:1', '4:5', '1.91:1'],
  'professional',
  '{"strategy": "mix_brand_and_trending", "max_hashtags": 10}',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 5. Create some test categories
INSERT INTO categories (id, brand_id, name, created_at, updated_at)
VALUES 
  ('00000000-0000-0000-0000-000000000005'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, 'Marketing', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000006'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, 'Product Updates', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 6. Create some test subcategories
INSERT INTO subcategories (id, brand_id, category_id, name, detail, url, default_hashtags, created_at, updated_at)
VALUES 
  ('00000000-0000-0000-0000-000000000007'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000005'::uuid, 'Social Media Tips', 'Tips for better social media engagement', 'https://example.com/tips', ARRAY['#socialmedia', '#tips'], NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000008'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000006'::uuid, 'New Features', 'Announcements about new product features', 'https://example.com/features', ARRAY['#newfeature', '#product'], NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 7. Create some test assets
INSERT INTO assets (id, brand_id, title, storage_path, width, height, aspect_ratio, crop_windows, tags, created_at)
VALUES 
  ('00000000-0000-0000-0000-000000000009'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, 'Test Image 1', 'test-image-1.jpg', 1080, 1080, '1:1', '{}', ARRAY['marketing', 'social'], NOW()),
  ('00000000-0000-0000-0000-000000000010'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, 'Test Image 2', 'test-image-2.jpg', 1080, 1350, '4:5', '{}', ARRAY['product', 'feature'], NOW())
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- VERIFY SETUP
-- ========================================

-- Check that everything was created
SELECT 'Profiles' as table_name, count(*) as count FROM profiles
UNION ALL
SELECT 'Brands', count(*) FROM brands
UNION ALL
SELECT 'Brand Memberships', count(*) FROM brand_memberships
UNION ALL
SELECT 'Content Preferences', count(*) FROM content_preferences
UNION ALL
SELECT 'Categories', count(*) FROM categories
UNION ALL
SELECT 'Subcategories', count(*) FROM subcategories
UNION ALL
SELECT 'Assets', count(*) FROM assets;

-- Show the test brand ID for use in the frontend
SELECT 'Test Brand ID for URL:' as info, id as brand_id FROM brands WHERE name = 'Test Brand';
