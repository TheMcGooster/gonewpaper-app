-- Civic Alerts table — town-scoped urgent broadcasts (boil water, storm, road closure)
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS civic_alerts (
  id           bigserial PRIMARY KEY,
  town_id      int NOT NULL DEFAULT 1,
  category     text NOT NULL CHECK (category IN ('weather', 'utility', 'road', 'general')),
  title        text NOT NULL,
  message      text NOT NULL,
  expires_at   timestamptz NOT NULL,
  is_active    boolean NOT NULL DEFAULT true,
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS civic_alerts_active_idx
  ON civic_alerts (town_id, expires_at)
  WHERE is_active = true;

ALTER TABLE civic_alerts ENABLE ROW LEVEL SECURITY;

-- Public read of active, non-expired alerts.
DROP POLICY IF EXISTS "civic_alerts read active" ON civic_alerts;
CREATE POLICY "civic_alerts read active" ON civic_alerts
  FOR SELECT
  USING (is_active = true AND expires_at > now());

-- Writes go through the service-role API route, so RLS write policies stay
-- closed. (The service role bypasses RLS.) This keeps the admin allow-list
-- in one place: app/api/admin/civic-alert/route.ts.
