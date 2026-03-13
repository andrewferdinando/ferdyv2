-- Add event_occurrence_id FK to drafts for linking drafts to specific event occurrences
ALTER TABLE drafts ADD COLUMN event_occurrence_id uuid REFERENCES event_occurrences(id) ON DELETE SET NULL;

-- Recreate drafts_with_labels view to include occurrence name
CREATE OR REPLACE VIEW drafts_with_labels AS
SELECT
  d.*,
  COALESCE(
    s_direct.name,
    s_via_rule.name
  ) AS subcategory_name,
  COALESCE(
    c_direct.name,
    c_via_rule.name
  ) AS category_name,
  eo.name AS event_occurrence_name
FROM drafts d
LEFT JOIN subcategories s_direct ON s_direct.id = d.subcategory_id
LEFT JOIN categories c_direct ON c_direct.id = s_direct.category_id
LEFT JOIN post_jobs pj ON pj.id = d.post_job_id
LEFT JOIN schedule_rules sr ON sr.id = pj.schedule_rule_id
LEFT JOIN subcategories s_via_rule ON s_via_rule.id = sr.subcategory_id
LEFT JOIN categories c_via_rule ON c_via_rule.id = s_via_rule.category_id
LEFT JOIN event_occurrences eo ON eo.id = d.event_occurrence_id;

GRANT SELECT ON drafts_with_labels TO authenticated;

-- Update unique indexes to include event_occurrence_id so two occurrences
-- on the same date don't collide
DROP INDEX IF EXISTS drafts_unique_brand_time_channel_source;
CREATE UNIQUE INDEX drafts_unique_brand_time_channel_source
ON public.drafts USING btree (
  brand_id, scheduled_for, channel, schedule_source, subcategory_id,
  COALESCE(event_occurrence_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

DROP INDEX IF EXISTS drafts_unique_framework;
CREATE UNIQUE INDEX drafts_unique_framework
ON public.drafts USING btree (
  brand_id, scheduled_for, channel, subcategory_id,
  COALESCE(event_occurrence_id, '00000000-0000-0000-0000-000000000000'::uuid)
)
WHERE (schedule_source = 'framework'::text);
