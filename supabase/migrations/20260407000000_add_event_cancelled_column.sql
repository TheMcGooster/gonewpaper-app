-- Migration: add_event_cancelled_column
-- Created: 2026-04-07
-- Adds a `cancelled` flag so organizers can soft-cancel their own events.
-- Updates flow through /api/events/update (service role + ownership check),
-- so no new RLS UPDATE policy is needed — the existing admin-only update
-- policy still applies to direct client writes.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS cancelled BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN events.cancelled IS 'When true, event is shown to users with a CANCELLED badge. Set by organizer via /api/events/update.';
