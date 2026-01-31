-- ================================================
-- EVENT REMINDER NOTIFICATIONS SETUP
-- ================================================
-- Run this in Supabase SQL Editor
-- ================================================

-- 1. Create table to track sent notifications (avoid duplicates)
CREATE TABLE IF NOT EXISTS event_reminders_sent (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  event_id INTEGER REFERENCES events(id),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

-- 2. Create a function to get users who need event reminders
-- This finds events starting in 25-35 minutes where:
-- - User has marked interest
-- - Reminder hasn't been sent yet
CREATE OR REPLACE FUNCTION get_upcoming_event_reminders()
RETURNS TABLE (
  user_id UUID,
  onesignal_player_id TEXT,
  event_id INTEGER,
  event_title TEXT,
  event_time TEXT,
  event_location TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ui.user_id,
    u.onesignal_player_id,
    e.id as event_id,
    e.title as event_title,
    e.time as event_time,
    e.location as event_location
  FROM user_interests ui
  JOIN events e ON e.id = ui.event_id
  JOIN users u ON u.id = ui.user_id
  WHERE
    -- Event is starting in next 25-35 minutes (30 min window)
    e.date::timestamp >= NOW() + INTERVAL '25 minutes'
    AND e.date::timestamp <= NOW() + INTERVAL '35 minutes'
    -- User has OneSignal player ID
    AND u.onesignal_player_id IS NOT NULL
    -- Haven't sent reminder yet
    AND NOT EXISTS (
      SELECT 1 FROM event_reminders_sent ers
      WHERE ers.user_id = ui.user_id AND ers.event_id = e.id
    );
END;
$$;

-- 3. Create index for better performance
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
