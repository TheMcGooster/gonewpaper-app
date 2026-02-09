-- Purge Past Events
-- Permanently deletes events where the date/time has already passed.
-- The API endpoint at /api/cron/purge-events handles this automatically.
-- This SQL function is a backup you can call manually: SELECT purge_past_events();

-- Update the function to purge immediately after event time passes (not just end of day)
CREATE OR REPLACE FUNCTION purge_past_events()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Clean up user_interests for past events
  DELETE FROM user_interests
  WHERE event_id IN (SELECT id FROM events WHERE date::timestamp < NOW());

  -- Clean up event_reminders_sent for past events
  DELETE FROM event_reminders_sent
  WHERE event_id IN (SELECT id FROM events WHERE date::timestamp < NOW());

  -- Delete the past events
  DELETE FROM events
  WHERE date::timestamp < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
