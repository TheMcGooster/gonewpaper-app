-- ================================================
-- ADD DAILY EVENT REMINDERS RPC FUNCTION
-- ================================================
-- Run this in Supabase SQL Editor.
-- This creates a function used by the daily event-reminders cron job
-- to find users who marked interest in today's events and haven't
-- been reminded yet.
-- ================================================

CREATE OR REPLACE FUNCTION get_daily_event_reminders(target_date TEXT)
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
BEGIN
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
    -- Only events on the target date
    e.date = target_date
    -- User must have a OneSignal player ID
    AND u.onesignal_player_id IS NOT NULL
    -- Haven't sent a reminder yet for this user + event
    AND NOT EXISTS (
      SELECT 1 FROM event_reminders_sent ers
      WHERE ers.user_id = ui.user_id AND ers.event_id = e.id
    );
END;
$$;

-- ================================================
-- DONE! This function is called by the event-reminders cron job.
-- The cron also has a fallback using separate queries in case
-- this function doesn't exist yet.
-- ================================================
