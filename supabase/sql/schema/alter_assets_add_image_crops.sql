ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS image_crops jsonb;
