-- Add setup_complete column to subcategories
-- Tracks whether the wizard was fully completed (all 4 steps including Finish).
-- Default TRUE so all existing categories are unaffected.
-- Categories created by the wizard start as FALSE and are set to TRUE on Finish.

ALTER TABLE subcategories
  ADD COLUMN IF NOT EXISTS setup_complete boolean NOT NULL DEFAULT true;
