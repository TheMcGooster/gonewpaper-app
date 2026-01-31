-- Add google_event_id column to events table for duplicate prevention
-- Run this in Supabase SQL Editor

-- Add the column
ALTER TABLE events ADD COLUMN IF NOT EXISTS google_event_id TEXT;

-- Add unique constraint to prevent duplicate events from Google Calendar
ALTER TABLE events ADD CONSTRAINT events_google_event_id_unique UNIQUE (google_event_id);

-- Add an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_events_google_event_id ON events(google_event_id);

-- Verify the column was added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'events' AND column_name = 'google_event_id';
