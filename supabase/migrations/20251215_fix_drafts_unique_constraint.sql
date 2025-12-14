-- Fix drafts unique constraints to include subcategory_id
-- Bug: The constraints only checked (brand_id, scheduled_for, channel, schedule_source)
-- This prevented multiple categories from having drafts at the same time on the same channel
-- Fix: Add subcategory_id to the unique constraint

-- Drop the old constraint
ALTER TABLE drafts DROP CONSTRAINT IF EXISTS drafts_unique_brand_time_channel_source;

-- Create the new constraint with subcategory_id included
ALTER TABLE drafts ADD CONSTRAINT drafts_unique_brand_time_channel_source 
    UNIQUE (brand_id, scheduled_for, channel, schedule_source, subcategory_id);

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT drafts_unique_brand_time_channel_source ON drafts IS 
    'Ensures that each category can only have one framework draft per time slot per channel. Multiple categories can have drafts at the same time.';
