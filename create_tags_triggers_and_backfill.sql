-- Create triggers to automatically manage tags when subcategories change
-- This ensures tags stay in sync with subcategories

-- Step 1: Create a function to handle tag creation/update when subcategory is created or updated
CREATE OR REPLACE FUNCTION sync_subcategory_to_tag()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Create a new tag when a subcategory is created
    INSERT INTO tags (brand_id, name, kind, is_active, created_at)
    VALUES (NEW.brand_id, NEW.name, 'subcategory', true, NOW())
    ON CONFLICT DO NOTHING; -- Prevent duplicates if tag already exists
    
    RETURN NEW;
  
  ELSIF TG_OP = 'UPDATE' THEN
    -- Update the tag name when subcategory name changes
    UPDATE tags
    SET name = NEW.name,
        updated_at = NOW()
    WHERE brand_id = NEW.brand_id
      AND kind = 'subcategory'
      AND name = OLD.name
      AND id IN (
        -- Find tag by matching subcategory name pattern or by some other means
        -- Since we don't have a direct foreign key, we'll match by name and brand
        SELECT id FROM tags 
        WHERE brand_id = NEW.brand_id 
          AND kind = 'subcategory'
          AND name = OLD.name
        LIMIT 1
      );
    
    RETURN NEW;
  
  ELSIF TG_OP = 'DELETE' THEN
    -- Soft-delete (set is_active = false) the tag when subcategory is deleted
    UPDATE tags
    SET is_active = false,
        updated_at = NOW()
    WHERE brand_id = OLD.brand_id
      AND kind = 'subcategory'
      AND name = OLD.name;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create triggers
DROP TRIGGER IF EXISTS trigger_subcategory_tag_insert ON subcategories;
CREATE TRIGGER trigger_subcategory_tag_insert
  AFTER INSERT ON subcategories
  FOR EACH ROW
  EXECUTE FUNCTION sync_subcategory_to_tag();

DROP TRIGGER IF EXISTS trigger_subcategory_tag_update ON subcategories;
CREATE TRIGGER trigger_subcategory_tag_update
  AFTER UPDATE ON subcategories
  FOR EACH ROW
  WHEN (OLD.name IS DISTINCT FROM NEW.name) -- Only fire when name changes
  EXECUTE FUNCTION sync_subcategory_to_tag();

DROP TRIGGER IF EXISTS trigger_subcategory_tag_delete ON subcategories;
CREATE TRIGGER trigger_subcategory_tag_delete
  AFTER DELETE ON subcategories
  FOR EACH ROW
  EXECUTE FUNCTION sync_subcategory_to_tag();

-- Step 3: Backfill tags for existing subcategories
-- This creates tags for all existing subcategories that don't already have tags
INSERT INTO tags (brand_id, name, kind, is_active, created_at)
SELECT DISTINCT
  s.brand_id,
  s.name,
  'subcategory'::text as kind,
  true as is_active,
  NOW() as created_at
FROM subcategories s
WHERE NOT EXISTS (
  -- Don't create if a tag already exists with the same name and brand
  SELECT 1 FROM tags t
  WHERE t.brand_id = s.brand_id
    AND t.name = s.name
    AND t.kind = 'subcategory'
)
ON CONFLICT DO NOTHING;

-- Verify the backfill worked
SELECT 
  s.id as subcategory_id,
  s.name as subcategory_name,
  s.brand_id,
  t.id as tag_id,
  t.name as tag_name,
  t.kind,
  t.is_active
FROM subcategories s
LEFT JOIN tags t ON t.brand_id = s.brand_id 
  AND t.name = s.name 
  AND t.kind = 'subcategory'
ORDER BY s.brand_id, s.name;

