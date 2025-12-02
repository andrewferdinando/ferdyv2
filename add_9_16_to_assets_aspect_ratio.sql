-- Migration: Add '9:16' to assets aspect_ratio check constraint
-- This allows the 9:16 aspect ratio for Reels & Stories format

-- First, drop the existing constraint
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_aspect_ratio_check;

-- Recreate the constraint with '9:16' added
ALTER TABLE assets 
  ADD CONSTRAINT assets_aspect_ratio_check 
  CHECK (aspect_ratio IN ('original','1:1','4:5','1.91:1','9:16'));

-- Also update the default_aspect_ratio constraint in content_preferences if it exists
ALTER TABLE content_preferences DROP CONSTRAINT IF EXISTS content_preferences_default_aspect_ratio_check;

ALTER TABLE content_preferences 
  ADD CONSTRAINT content_preferences_default_aspect_ratio_check 
  CHECK (default_aspect_ratio IN ('1:1','4:5','1.91:1','9:16'));

