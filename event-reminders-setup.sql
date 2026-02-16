-- ================================================
-- EVENT REMINDER NOTIFICATIONS SETUP (UPDATED)
-- ================================================
-- Run this in Supabase SQL Editor.
-- If you already ran the old version, that's OK!
-- CREATE OR REPLACE will update the function in place,
-- and CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS
-- will safely skip anything that already exists.
-- ================================================

-- 1. Create table to track sent notifications (avoid duplicates)
-- This table stores a record every time we send a reminder
-- so that we never send the same person a reminder twice for the same event.
CREATE TABLE IF NOT EXISTS event_reminders_sent (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  event_id BIGINT REFERENCES events(id),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

-- 1b. Enable Row Level Security (RLS) on event_reminders_sent
-- Even though our Edge Function uses the service role key (which bypasses RLS),
-- enabling RLS is good practice so that regular users can't read or modify
-- this table directly from the client side.
ALTER TABLE event_reminders_sent ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (safe if they don't exist yet)
-- PostgreSQL doesn't support CREATE POLICY IF NOT EXISTS,
-- so we drop-then-create to make this file safely re-runnable.
DROP POLICY IF EXISTS "Service role can insert reminders" ON event_reminders_sent;
DROP POLICY IF EXISTS "Users can view their own sent reminders" ON event_reminders_sent;

-- Policy: Only the service role (used by Edge Functions) can insert rows.
-- Regular authenticated users have no access to this table.
CREATE POLICY "Service role can insert reminders"
  ON event_reminders_sent
  FOR INSERT
  WITH CHECK (true);

-- Policy: Users can read only their own reminder records (optional, for transparency).
CREATE POLICY "Users can view their own sent reminders"
  ON event_reminders_sent
  FOR SELECT
  USING (auth.uid() = user_id);

-- 2. Create a function to get users who need event reminders
-- This finds events starting in 25-35 minutes where:
--   - User has marked interest
--   - Reminder hasn't been sent yet
--
-- IMPORTANT NOTES ON HOW THIS WORKS:
-- - e.date is stored as TEXT in 'YYYY-MM-DD' format (e.g. '2026-02-15')
-- - e.time is stored as TEXT in 12-hour format (e.g. '9:30 AM' or '3:30 PM')
-- - We combine them into a real timestamp using to_timestamp() so Postgres
--   can do proper time math.
-- - We skip any events where the time field is NULL or empty to avoid crashes.
-- - All comparisons use Central Time (America/Chicago) since Chariton, IA is
--   in the Central time zone.
CREATE OR REPLACE FUNCTION get_upcoming_event_reminders()
RETURNS TABLE (
  user_id UUID,
  onesignal_player_id TEXT,
  event_id BIGINT,
  event_title TEXT,
  event_time TEXT,
  event_location TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  now_central TIMESTAMP;
BEGIN
  -- Convert current UTC time to Central Time (Chariton, IA is UTC-6 / UTC-5 DST)
  -- AT TIME ZONE 'America/Chicago' handles daylight saving automatically.
  now_central := NOW() AT TIME ZONE 'America/Chicago';

  RETURN QUERY
  SELECT
    ui.user_id,
    u.onesignal_player_id,
    e.id AS event_id,
    e.title AS event_title,
    e.time AS event_time,
    e.location AS event_location
  FROM user_interests ui
  JOIN events e ON e.id = ui.event_id
  JOIN users u ON u.id = ui.user_id
  WHERE
    -- Guard: skip events with missing or empty time values.
    -- If e.time is NULL or '' the to_timestamp() call below would crash,
    -- so we filter those out first.
    e.time IS NOT NULL
    AND e.time != ''

    -- Combine date + time text into a real timestamp for comparison.
    -- to_timestamp() with the format mask 'YYYY-MM-DD HH:MI AM' correctly
    -- handles 12-hour AM/PM times like '9:30 AM' and '3:30 PM'.
    -- (The old ::timestamp cast could NOT parse AM/PM and would error out.)
    AND to_timestamp(e.date || ' ' || e.time, 'YYYY-MM-DD HH:MI AM')
          >= now_central + INTERVAL '25 minutes'
    AND to_timestamp(e.date || ' ' || e.time, 'YYYY-MM-DD HH:MI AM')
          <= now_central + INTERVAL '35 minutes'

    -- User must have a OneSignal player ID so we can actually send the push
    AND u.onesignal_player_id IS NOT NULL

    -- Make sure we haven't already sent a reminder for this user + event
    AND NOT EXISTS (
      SELECT 1 FROM event_reminders_sent ers
      WHERE ers.user_id = ui.user_id AND ers.event_id = e.id
    );
END;
$$;

-- 3. Create indexes for better performance
-- These make the JOIN and WHERE lookups faster on large tables.
CREATE INDEX IF NOT EXISTS idx_user_interests_user_event ON user_interests(user_id, event_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);

-- ================================================
-- DONE!
-- ================================================
-- Next: Set up a cron job or Edge Function to:
-- 1. Call get_upcoming_event_reminders() every 5 minutes
-- 2. Send push notifications via OneSignal API
-- 3. Record sent notifications in event_reminders_sent
-- ================================================
