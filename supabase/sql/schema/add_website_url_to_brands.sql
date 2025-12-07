-- Add website_url column to brands table
-- This migration adds website_url alongside the existing timezone and country_code columns

ALTER TABLE brands
ADD COLUMN IF NOT EXISTS website_url TEXT;

COMMENT ON COLUMN brands.website_url IS 'Brand website URL for reference and validation';
