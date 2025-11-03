-- Add subcategory_id to drafts table and create view with labels
-- This allows drafts to directly reference their subcategory/category

-- 1) Add column
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS subcategory_id uuid;

-- 2) Add FK for data integrity
ALTER TABLE drafts
  DROP CONSTRAINT IF EXISTS drafts_subcategory_id_fkey;
  
ALTER TABLE drafts
  ADD CONSTRAINT drafts_subcategory_id_fkey
  FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) ON DELETE SET NULL;

-- 3) Backfill existing drafts from schedule_rules
-- If drafts reference a schedule rule via post_job -> schedule_rule_id, copy its subcategory_id
UPDATE drafts d
SET subcategory_id = r.subcategory_id
FROM post_jobs pj
JOIN schedule_rules r ON r.id = pj.schedule_rule_id
WHERE d.post_job_id = pj.id
  AND d.subcategory_id IS NULL
  AND r.subcategory_id IS NOT NULL;

-- Also backfill from framework_targets if available (for framework-created drafts)
-- This assumes framework_targets has subcategory_id and can be matched to drafts
-- Adjust the join conditions based on your actual framework_targets structure
-- UPDATE drafts d
-- SET subcategory_id = ft.subcategory_id
-- FROM framework_targets ft
-- WHERE d.schedule_source = 'framework'
--   AND d.subcategory_id IS NULL
--   AND ft.subcategory_id IS NOT NULL
--   AND -- add matching logic here (e.g., scheduled_for matching scheduled_at)
-- ;

-- 4) Create view for UI (names ready to render)
CREATE OR REPLACE VIEW drafts_with_labels AS
SELECT
  d.*,
  s.name AS subcategory_name,
  c.name AS category_name
FROM drafts d
LEFT JOIN subcategories s ON s.id = d.subcategory_id
LEFT JOIN categories c ON c.id = s.category_id;

-- Grant access to the view
GRANT SELECT ON drafts_with_labels TO authenticated;

-- 5) Add comment
COMMENT ON COLUMN drafts.subcategory_id IS 'Reference to the subcategory this draft belongs to. Populated from schedule_rules.subcategory_id when drafts are created.';

