-- Fix drafts_with_labels view to handle NULL subcategory_id
-- When subcategory_id is NULL on draft, fall back to joining through post_jobs -> schedule_rules
-- This ensures drafts created through rpc_push_framework_to_drafts are properly categorized
-- even when subcategory_id isn't set directly on the draft

CREATE OR REPLACE VIEW drafts_with_labels AS
SELECT
  d.*,
  COALESCE(
    s1.name,  -- Direct subcategory join
    s2.name   -- Subcategory from schedule_rule via post_job
  ) AS subcategory_name,
  COALESCE(
    c1.name,  -- Category from direct subcategory join
    c2.name   -- Category from schedule_rule subcategory
  ) AS category_name
FROM drafts d
-- Primary join: direct subcategory_id on draft
LEFT JOIN subcategories s1 ON s1.id = d.subcategory_id
LEFT JOIN categories c1 ON c1.id = s1.category_id
-- Fallback join: through post_jobs -> schedule_rules when subcategory_id is NULL
LEFT JOIN post_jobs pj ON pj.id = d.post_job_id AND d.subcategory_id IS NULL
LEFT JOIN schedule_rules sr ON sr.id = pj.schedule_rule_id AND pj.id = d.post_job_id
LEFT JOIN subcategories s2 ON s2.id = sr.subcategory_id
LEFT JOIN categories c2 ON c2.id = s2.category_id;

-- Grant access to the view
GRANT SELECT ON drafts_with_labels TO authenticated;

