-- Add brand_summary fields to brands table
-- This migration adds fields for AI-generated brand summaries

ALTER TABLE brands
ADD COLUMN IF NOT EXISTS brand_summary JSONB,
ADD COLUMN IF NOT EXISTS brand_summary_status TEXT CHECK (brand_summary_status IN ('pending', 'complete', 'failed')) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS brand_summary_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN brands.brand_summary IS 'AI-generated brand summary stored as JSON';
COMMENT ON COLUMN brands.brand_summary_status IS 'Status of brand summary generation: pending, complete, or failed';
COMMENT ON COLUMN brands.brand_summary_updated_at IS 'Timestamp when brand summary was last updated';


