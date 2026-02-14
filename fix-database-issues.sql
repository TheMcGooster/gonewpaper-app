-- ================================================
-- FIX DATABASE ISSUES FOR NOTIFICATIONS PIPELINE
-- ================================================
-- Run this in Supabase SQL Editor
-- Fixes: FK constraints, RPC return types, time format handling
-- ================================================

-- 1. Add missing foreign key from user_interests to public.users
--    (PostgREST needs this FK to allow JOIN queries like:
--     .select('user_id, event_id, users!inner(id, onesignal_player_id)')
--    )
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_interests_user_id_fkey_public'
      AND table_name = 'user_interests'
  ) THEN
    ALTER TABLE user_interests
      ADD CONSTRAINT user_interests_user_id_fkey_public
      FOREIGN KEY (user_id) REFERENCES public.users(id);
  END IF;
END $$;

-- 2. Fix event_reminders_sent table: event_id type should match events.id
--    (events.id may be BIGINT, but event_reminders_sent.event_id was INTEGER)
ALTER TABLE event_reminders_sent
  ALTER COLUMN event_id TYPE BIGINT;

-- 3. Recreate the RPC function with BIGINT return type for event_id
--    and better time format handling (supports both "9:30 AM" and "06:30:00")
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
  -- Convert current UTC time to Central Time (Chariton, IA)
  now_central := NOW() AT TIME ZONE 'America/Chicago';

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
    -- Try to parse the combined date+time into a timestamp
    -- Handles both "9:30 AM" / "3:30 PM" and "06:30:00" / "14:00" formats
    -- PostgreSQL's to_timestamp is flexible with these patterns
    e.time IS NOT NULL
    AND e.date IS NOT NULL
    AND (e.date || ' ' || e.time)::timestamp >= now_central + INTERVAL '25 minutes'
    AND (e.date || ' ' || e.time)::timestamp <= now_central + INTERVAL '35 minutes'
    -- User has OneSignal subscription ID
    AND u.onesignal_player_id IS NOT NULL
    -- Haven't sent reminder yet
    AND NOT EXISTS (
      SELECT 1 FROM event_reminders_sent ers
      WHERE ers.user_id = ui.user_id AND ers.event_id = e.id
    );
END;
$$;

-- 4. Verify: Check the actual type of events.id
-- (Run this to confirm - should show bigint or integer)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'events' AND column_name = 'id';

-- 5. Verify: Check user_interests foreign keys
SELECT
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS referenced_table,
  ccu.column_name AS referenced_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'user_interests'
  AND tc.constraint_type = 'FOREIGN KEY';

-- ================================================
-- DONE! Expected output:
-- 1. FK constraint added between user_interests.user_id -> public.users.id
-- 2. event_reminders_sent.event_id changed to BIGINT
-- 3. RPC function updated with BIGINT return type
-- 4. Verification queries show events.id type and FK constraints
-- ================================================
