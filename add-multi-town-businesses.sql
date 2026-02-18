-- =============================================================
-- MULTI-TOWN BUSINESSES - Add additional_town_ids array column
-- Run this in Supabase SQL Editor
-- =============================================================

-- 1. Add the column (integer array, defaults to empty)
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS additional_town_ids integer[] DEFAULT '{}';

-- 2. Add a comment explaining the column
COMMENT ON COLUMN businesses.additional_town_ids IS
  'Array of additional town IDs where this business should appear. The primary town_id is always included. Use this for businesses that serve multiple towns (delivery, web-based, regional services).';

-- 3. Create a GIN index for fast array lookups
CREATE INDEX IF NOT EXISTS idx_businesses_additional_town_ids
ON businesses USING GIN (additional_town_ids);

-- 4. Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'businesses' AND column_name = 'additional_town_ids';
