-- Fix drafts_with_labels view to handle NULL subcategory_id
-- When subcategory_id is NULL on draft, fall back to joining through post_jobs -> schedule_rules
-- This ensures drafts created through rpc_push_framework_to_drafts are properly categorized
-- even when subcategory_id isn't set directly on the draft

CREATE OR REPLACE VIEW drafts_with_labels AS
SELECT
  d.*,
  COALESCE(
    s_direct.name,      -- Direct subcategory join (preferred if subcategory_id is set)
    s_via_rule.name     -- Subcategory from schedule_rule via post_job (fallback)
  ) AS subcategory_name,
  COALESCE(
    c_direct.name,      -- Category from direct subcategory join (preferred)
    c_via_rule.name     -- Category from schedule_rule subcategory (fallback)
  ) AS category_name
FROM drafts d
-- Primary path: direct subcategory_id on draft
LEFT JOIN subcategories s_direct ON s_direct.id = d.subcategory_id
LEFT JOIN categories c_direct ON c_direct.id = s_direct.category_id
-- Fallback path: through post_jobs -> schedule_rules
LEFT JOIN post_jobs pj ON pj.id = d.post_job_id
LEFT JOIN schedule_rules sr ON sr.id = pj.schedule_rule_id
LEFT JOIN subcategories s_via_rule ON s_via_rule.id = sr.subcategory_id
LEFT JOIN categories c_via_rule ON c_via_rule.id = s_via_rule.category_id;

-- Grant access to the view
GRANT SELECT ON drafts_with_labels TO authenticated;

-- Also backfill any existing drafts that have NULL subcategory_id but have a post_job with schedule_rule
UPDATE drafts d
SET subcategory_id = sr.subcategory_id
FROM post_jobs pj
JOIN schedule_rules sr ON sr.id = pj.schedule_rule_id
WHERE d.post_job_id = pj.id
  AND d.subcategory_id IS NULL
  AND sr.subcategory_id IS NOT NULL;

