-- Add processed_images column to assets table
-- This column stores information about processed (cropped + resized) versions of images
-- for different aspect ratios required by Meta (Instagram/Facebook)
--
-- Structure:
-- {
--   "1:1": { "storage_path": "...", "width": 1080, "height": 1080, "processed_at": "..." },
--   "4:5": { "storage_path": "...", "width": 1080, "height": 1350, "processed_at": "..." },
--   "1.91:1": { "storage_path": "...", "width": 1080, "height": 566, "processed_at": "..." },
--   "9:16": { "storage_path": "...", "width": 1080, "height": 1920, "processed_at": "..." }
-- }

ALTER TABLE assets ADD COLUMN IF NOT EXISTS processed_images jsonb;

-- Add comment for documentation
COMMENT ON COLUMN assets.processed_images IS 'JSONB containing processed image versions for different aspect ratios. Keys are aspect ratio strings (1:1, 4:5, 1.91:1, 9:16), values contain storage_path, width, height, and processed_at timestamp.';
