-- Enable Row Level Security on tags and asset_tags tables.
-- Follows the same pattern as all other brand-scoped tables.

-- ============================================================
-- A. Enable RLS on `tags` (has brand_id column)
-- ============================================================

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tags for brands they are members of"
  ON tags FOR SELECT
  USING (user_has_brand_access(brand_id));

CREATE POLICY "Users can manage tags for brands they have edit access to"
  ON tags FOR ALL
  USING (user_has_brand_edit_access(brand_id))
  WITH CHECK (user_has_brand_edit_access(brand_id));

-- ============================================================
-- B. Enable RLS on `asset_tags` (resolves brand via tag_id → tags.brand_id)
-- ============================================================

ALTER TABLE asset_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view asset_tags for brands they are members of"
  ON asset_tags FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM tags WHERE tags.id = asset_tags.tag_id
      AND user_has_brand_access(tags.brand_id))
  );

CREATE POLICY "Users can manage asset_tags for brands they have edit access to"
  ON asset_tags FOR ALL
  USING (
    EXISTS (SELECT 1 FROM tags WHERE tags.id = asset_tags.tag_id
      AND user_has_brand_edit_access(tags.brand_id))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM tags WHERE tags.id = asset_tags.tag_id
      AND user_has_brand_edit_access(tags.brand_id))
  );

-- ============================================================
-- C. Cross-brand protection trigger on `asset_tags`
--    Prevents linking an asset from Brand A to a tag from Brand B.
-- ============================================================

CREATE OR REPLACE FUNCTION check_asset_tag_brand_match()
RETURNS TRIGGER AS $$
DECLARE
  v_asset_brand_id uuid;
  v_tag_brand_id uuid;
BEGIN
  SELECT brand_id INTO v_asset_brand_id FROM assets WHERE id = NEW.asset_id;
  SELECT brand_id INTO v_tag_brand_id FROM tags WHERE id = NEW.tag_id;

  IF v_asset_brand_id IS NULL THEN
    RAISE EXCEPTION 'asset_tags: asset % not found', NEW.asset_id;
  END IF;
  IF v_tag_brand_id IS NULL THEN
    RAISE EXCEPTION 'asset_tags: tag % not found', NEW.tag_id;
  END IF;
  IF v_asset_brand_id <> v_tag_brand_id THEN
    RAISE EXCEPTION 'asset_tags: asset brand (%) does not match tag brand (%)',
      v_asset_brand_id, v_tag_brand_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_asset_tag_brand_match
  BEFORE INSERT OR UPDATE ON asset_tags
  FOR EACH ROW EXECUTE FUNCTION check_asset_tag_brand_match();
