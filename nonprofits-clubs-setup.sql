-- ================================================
-- NON-PROFIT ORGANIZATIONS & CLUBS/GROUPS SETUP
-- ================================================
-- Run this in Supabase SQL Editor
-- ================================================

-- 1. Create nonprofits table
CREATE TABLE IF NOT EXISTS nonprofits (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  logo_emoji TEXT NOT NULL DEFAULT '🏛️',
  logo_url TEXT,
  tagline TEXT NOT NULL DEFAULT '',
  description TEXT,
  donation_url TEXT NOT NULL,
  website TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  town_id INTEGER REFERENCES towns(id) DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create clubs table
CREATE TABLE IF NOT EXISTS clubs (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  logo_emoji TEXT NOT NULL DEFAULT '👥',
  logo_url TEXT,
  tagline TEXT NOT NULL DEFAULT '',
  description TEXT,
  website TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  meeting_schedule TEXT,
  meeting_location TEXT,
  town_id INTEGER REFERENCES towns(id) DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_nonprofits_town ON nonprofits(town_id);
CREATE INDEX IF NOT EXISTS idx_nonprofits_active ON nonprofits(is_active);
CREATE INDEX IF NOT EXISTS idx_clubs_town ON clubs(town_id);
CREATE INDEX IF NOT EXISTS idx_clubs_active ON clubs(is_active);

-- 4. Enable Row Level Security
ALTER TABLE nonprofits ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

-- 5. Create policies for public read access
CREATE POLICY "Allow public read access on nonprofits" ON nonprofits
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access on clubs" ON clubs
  FOR SELECT USING (true);

-- 6. Insert sample data for Chariton

-- Chariton 4th of July Celebration
INSERT INTO nonprofits (name, category, logo_emoji, tagline, donation_url, email, town_id, display_order)
VALUES (
  'Chariton 4th of July Celebration',
  'Community Events',
  '🎆',
  'Keeping small-town traditions alive!',
  'https://www.zeffy.com/en-US/donation-form/2026-4th-of-july-celebration',
  'chariton4thjulycommitte@gmail.com',
  1,
  1
);

-- Chariton Rock Climbers
INSERT INTO clubs (name, category, logo_emoji, tagline, email, town_id, display_order)
VALUES (
  'Chariton Rock Climbers',
  'Sports & Recreation',
  '🧗',
  'Climb higher together!',
  'jarrettcmcgee@gmail.com',
  1,
  1
);

-- ================================================
-- DONE!
-- ================================================
-- After running this SQL:
-- 1. Check the nonprofits and clubs tables in Supabase Table Editor
-- 2. Upload logo images and update logo_url for each entry
-- 3. The app will now show these in the new tabs
-- ================================================
