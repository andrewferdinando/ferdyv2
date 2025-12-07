-- Add country_code column to brands table
-- This migration adds country_code alongside the existing timezone column

ALTER TABLE brands
ADD COLUMN IF NOT EXISTS country_code VARCHAR(2);

COMMENT ON COLUMN brands.country_code IS 'ISO 3166-1 alpha-2 country code (e.g., NZ, AU, US)';
COMMENT ON COLUMN brands.timezone IS 'IANA timezone identifier (e.g., Pacific/Auckland, Australia/Sydney)';

-- Update existing brands to have default values if needed
-- You may want to run a separate script to backfill based on existing timezone values
-- UPDATE brands SET country_code = 'NZ' WHERE timezone LIKE 'Pacific/%' AND country_code IS NULL;
-- UPDATE brands SET country_code = 'AU' WHERE timezone LIKE 'Australia/%' AND country_code IS NULL;

