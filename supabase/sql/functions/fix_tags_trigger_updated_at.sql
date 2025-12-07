-- Fix tags trigger to remove updated_at column reference
-- This fixes the error when deleting subcategories: column "updated_at" of relation "tags" does not exist

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
    -- First, try to update existing tag
    UPDATE tags
    SET name = NEW.name
    WHERE brand_id = NEW.brand_id
      AND kind = 'subcategory'
      AND name = OLD.name;
    
    -- If no tag exists (e.g., tag was deleted or never existed), create a new one
    IF NOT FOUND THEN
      INSERT INTO tags (brand_id, name, kind, is_active, created_at)
      VALUES (NEW.brand_id, NEW.name, 'subcategory', true, NOW())
      ON CONFLICT DO NOTHING;
    END IF;
    
    RETURN NEW;
  
  ELSIF TG_OP = 'DELETE' THEN
    -- Soft-delete (set is_active = false) the tag when subcategory is deleted
    UPDATE tags
    SET is_active = false
    WHERE brand_id = OLD.brand_id
      AND kind = 'subcategory'
      AND name = OLD.name;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

