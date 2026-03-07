-- calendar_sources table — stores calendar feed configurations for dynamic multi-town sync
CREATE TABLE IF NOT EXISTS calendar_sources (
  id SERIAL PRIMARY KEY,
  town_id INTEGER REFERENCES towns(id) NOT NULL,
  calendar_id TEXT NOT NULL,  -- Google Calendar ID or iCal URL
  source_name TEXT NOT NULL,  -- e.g. "Chariton Chamber of Commerce"
  source_type TEXT NOT NULL DEFAULT 'google_calendar',  -- google_calendar | ical | eventbrite
  category_emoji TEXT DEFAULT '📅',
  is_active BOOLEAN DEFAULT true,
  sync_frequency TEXT DEFAULT 'weekly',  -- daily | weekly | monthly
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE calendar_sources ENABLE ROW LEVEL SECURITY;

-- Public read access for active sources
DROP POLICY IF EXISTS "Public can view active calendar sources" ON calendar_sources;
CREATE POLICY "Public can view active calendar sources"
  ON calendar_sources FOR SELECT
  USING (is_active = true);

-- Service role full access
DROP POLICY IF EXISTS "Service role full access to calendar sources" ON calendar_sources;
CREATE POLICY "Service role full access to calendar sources"
  ON calendar_sources FOR ALL
  USING (true) WITH CHECK (true);

-- Index
CREATE INDEX IF NOT EXISTS idx_calendar_sources_town ON calendar_sources(town_id, is_active);

-- Seed with the known Chariton Chamber calendar
INSERT INTO calendar_sources (town_id, calendar_id, source_name, source_type, category_emoji)
VALUES
  (1, 'charitoncc@gmail.com', 'Chariton Chamber of Commerce', 'google_calendar', '🏛️')
ON CONFLICT DO NOTHING;
