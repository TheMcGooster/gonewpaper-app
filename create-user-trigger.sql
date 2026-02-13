-- ================================================
-- AUTO-CREATE PUBLIC.USERS ROW ON SIGNUP
-- ================================================
-- Run this ONCE in Supabase SQL Editor.
-- When a new user signs up via Supabase Auth, this trigger
-- automatically creates a matching row in public.users so that
-- OneSignal player IDs, notification preferences, and user_interests
-- foreign keys all work from day one.
-- ================================================

-- 1. Create the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, user_type, town_id, notification_preferences)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL),
    'resident',
    1,  -- Default to Chariton (town_id = 1)
    '{"jobs":true,"events":true,"community":true}'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;  -- Safe if row already exists
  RETURN NEW;
END;
$$;

-- 2. Create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Backfill: Create rows for any existing auth users who are missing from public.users
INSERT INTO public.users (id, email, user_type, town_id, notification_preferences)
SELECT
  au.id,
  au.email,
  'resident',
  1,
  '{"jobs":true,"events":true,"community":true}'::jsonb
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL;
