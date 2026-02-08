-- community_posts RLS (Row Level Security) Setup
-- Run this in the Supabase SQL Editor to secure the community_posts table.

-- 1. Enable RLS on the community_posts table
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

-- 2. SELECT policy: Allow anyone (anon + authenticated) to read active posts
CREATE POLICY "Anyone can view active community posts"
  ON community_posts
  FOR SELECT
  USING (is_active = true);

-- 3. INSERT policy: Allow anyone (including anon) to insert new posts
--    Restrict inserts to town_id=1 and is_active=true so users
--    cannot insert deactivated posts or posts for other towns.
CREATE POLICY "Anyone can insert community posts for town 1"
  ON community_posts
  FOR INSERT
  WITH CHECK (town_id = 1 AND is_active = true);

-- 4. UPDATE policy: Allow only admin users to update rows (for soft-delete via is_active=false)
CREATE POLICY "Admins can update community posts"
  ON community_posts
  FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND auth.jwt() ->> 'email' IN (
      'jarrettcmcgee@gmail.com',
      'goflufffactory@gmail.com',
      'thenewpaperchariton@gmail.com'
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.jwt() ->> 'email' IN (
      'jarrettcmcgee@gmail.com',
      'goflufffactory@gmail.com',
      'thenewpaperchariton@gmail.com'
    )
  );
