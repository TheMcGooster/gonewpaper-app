-- ================================================
-- TEST DATA FOR EVENT REMINDER NOTIFICATIONS
-- ================================================
-- Run this in Supabase SQL Editor
--
-- INSTRUCTIONS:
-- 1. First, make sure you've run event-reminders-setup.sql (creates the table + function)
-- 2. Run this SQL to insert test data
-- 3. Then trigger the ActivePieces flow (or call the API endpoint manually)
-- ================================================

-- Step 1: Check if event_reminders_sent table exists (from event-reminders-setup.sql)
-- If this fails, run event-reminders-setup.sql first!
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'event_reminders_sent'
);

-- Step 2: Insert a test event that starts ~30 minutes from NOW
-- (The reminder system looks for events starting in 25-35 minutes)
INSERT INTO events (title, category, date, time, location, price, source, verified, town_id)
VALUES (
  'TEST: Reminder Notification Test Event',
  'Community',
  -- Set the date to 30 minutes from right now (UTC)
  (NOW() + INTERVAL '30 minutes')::text,
  to_char(NOW() + INTERVAL '30 minutes', 'HH12:MI AM'),
  'Chariton Town Square',
  'Free',
  'manual-test',
  true,
  1
)
RETURNING id, title, date, time;
-- ^^^ NOTE THE RETURNED EVENT ID - you'll need it below

-- Step 3: Find your user ID
-- Look for jarrettcmcgee@gmail.com or goflufffactory@gmail.com
SELECT id, email, raw_user_meta_data->>'full_name' as name
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- Step 4: Check if your user has a OneSignal player ID
SELECT id, onesignal_player_id
FROM users
ORDER BY id DESC
LIMIT 5;

-- ================================================
-- AFTER RUNNING THE ABOVE, use the returned event ID
-- and your user ID to run the INSERT below.
-- Replace <EVENT_ID> and <USER_ID> with actual values.
-- ================================================

-- Step 5: Create the user_interest linking your user to the test event
-- UNCOMMENT and update these values:
-- INSERT INTO user_interests (user_id, event_id)
-- VALUES ('<YOUR_USER_UUID>', <EVENT_ID_FROM_STEP_2>);

-- Step 6: Verify the reminder function finds the test data
SELECT * FROM get_upcoming_event_reminders();

-- ================================================
-- HOW TO TRIGGER THE REMINDER
-- ================================================
-- Option A: ActivePieces HTTP Request
--   URL: https://www.gonewpaper.com/api/cron/event-reminders
--   Method: GET
--   Header: Authorization: Bearer <your CRON_SECRET value from Vercel env vars>
--
-- Option B: curl from terminal (replace YOUR_CRON_SECRET):
--   curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://www.gonewpaper.com/api/cron/event-reminders
--
-- Option C: Test locally:
--   curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/event-reminders
-- ================================================

-- CLEANUP (run after testing):
-- DELETE FROM event_reminders_sent WHERE event_id IN (SELECT id FROM events WHERE source = 'manual-test');
-- DELETE FROM user_interests WHERE event_id IN (SELECT id FROM events WHERE source = 'manual-test');
-- DELETE FROM events WHERE source = 'manual-test';
