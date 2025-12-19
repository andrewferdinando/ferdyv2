-- SQL script to delete all data related to brand 14214424-7951-460f-ac99-4a59e79c80ab
-- Execute this in your Supabase SQL editor
-- WARNING: This will permanently delete all data for this brand. Make sure you have backups if needed.

-- Brand ID to delete
DO $$
DECLARE
  brand_id_to_delete uuid := '14214424-7951-460f-ac99-4a59e79c80ab';
BEGIN
  -- Delete in order to respect foreign key constraints:

  -- 1. Delete publishes (references post_jobs and drafts)
  DELETE FROM publishes WHERE brand_id = brand_id_to_delete;

  -- 2. Delete post_jobs (references schedule_rules and drafts)
  DELETE FROM post_jobs WHERE brand_id = brand_id_to_delete;

  -- 3. Delete drafts (references subcategories via subcategory_id)
  DELETE FROM drafts WHERE brand_id = brand_id_to_delete;

  -- 4. Delete event_occurrences (if exists, references subcategories)
  DELETE FROM event_occurrences 
  WHERE subcategory_id IN (
    SELECT id FROM subcategories WHERE brand_id = brand_id_to_delete
  );

  -- 5. Delete asset_tags for assets in this brand
  DELETE FROM asset_tags 
  WHERE asset_id IN (
    SELECT id FROM assets WHERE brand_id = brand_id_to_delete
  );

  -- 6. Delete asset_tags for tags in this brand
  DELETE FROM asset_tags 
  WHERE tag_id IN (
    SELECT id FROM tags WHERE brand_id = brand_id_to_delete
  );

  -- 7. Delete schedule_rules (references subcategories)
  DELETE FROM schedule_rules WHERE brand_id = brand_id_to_delete;

  -- 8. Delete tags (references subcategories)
  DELETE FROM tags WHERE brand_id = brand_id_to_delete;

  -- 9. Delete subcategories (references categories)
  DELETE FROM subcategories WHERE brand_id = brand_id_to_delete;

  -- 10. Delete categories (references brands)
  DELETE FROM categories WHERE brand_id = brand_id_to_delete;

  -- 11. Delete assets (references brands)
  DELETE FROM assets WHERE brand_id = brand_id_to_delete;

  -- 12. Delete content_preferences (references brands)
  DELETE FROM content_preferences WHERE brand_id = brand_id_to_delete;

  RAISE NOTICE 'Deletion complete for brand %', brand_id_to_delete;
END $$;

-- Verify deletion (should all be 0)
SELECT 
  'Verification' as check_type,
  (SELECT COUNT(*) FROM categories WHERE brand_id = '14214424-7951-460f-ac99-4a59e79c80ab') as categories,
  (SELECT COUNT(*) FROM subcategories WHERE brand_id = '14214424-7951-460f-ac99-4a59e79c80ab') as subcategories,
  (SELECT COUNT(*) FROM schedule_rules WHERE brand_id = '14214424-7951-460f-ac99-4a59e79c80ab') as schedule_rules,
  (SELECT COUNT(*) FROM drafts WHERE brand_id = '14214424-7951-460f-ac99-4a59e79c80ab') as drafts,
  (SELECT COUNT(*) FROM post_jobs WHERE brand_id = '14214424-7951-460f-ac99-4a59e79c80ab') as post_jobs,
  (SELECT COUNT(*) FROM assets WHERE brand_id = '14214424-7951-460f-ac99-4a59e79c80ab') as assets,
  (SELECT COUNT(*) FROM tags WHERE brand_id = '14214424-7951-460f-ac99-4a59e79c80ab') as tags,
  (SELECT COUNT(*) FROM publishes WHERE brand_id = '14214424-7951-460f-ac99-4a59e79c80ab') as publishes;
