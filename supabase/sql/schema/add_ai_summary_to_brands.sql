-- Add AI summary columns to brands table
-- This allows storing AI-generated brand summaries for use in AI copy prompts

ALTER TABLE brands
ADD COLUMN IF NOT EXISTS ai_summary TEXT;

ALTER TABLE brands
ADD COLUMN IF NOT EXISTS ai_summary_last_generated_at TIMESTAMPTZ;

COMMENT ON COLUMN brands.ai_summary IS 'AI-generated brand summary (2-3 paragraphs) for use in copy generation prompts';
COMMENT ON COLUMN brands.ai_summary_last_generated_at IS 'Timestamp when the AI summary was last generated';




