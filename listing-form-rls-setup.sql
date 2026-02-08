-- ================================================
-- LISTING FORM RLS POLICIES
-- ================================================
-- Run this in Supabase SQL Editor to allow the
-- self-service listing form to insert rows.
-- ================================================

-- Allow inserts into nonprofits table (restricted to town_id=1, is_active=true)
CREATE POLICY "Allow public insert on nonprofits" ON nonprofits
  FOR INSERT
  WITH CHECK (town_id = 1 AND is_active = true);

-- Allow inserts into clubs table (restricted to town_id=1, is_active=true)
CREATE POLICY "Allow public insert on clubs" ON clubs
  FOR INSERT
  WITH CHECK (town_id = 1 AND is_active = true);

-- ================================================
-- DONE! The listing form on the site can now insert rows.
-- Submissions auto-publish and appear immediately.
-- ================================================
