-- Add position column to asset_tags for wizard-managed ordering.
-- NULL for Content Library (unordered) rows; 0-based integer for wizard-managed rows.
ALTER TABLE asset_tags ADD COLUMN position integer DEFAULT NULL;
