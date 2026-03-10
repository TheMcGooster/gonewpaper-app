-- Migration: add_event_source_type_end_time_address
-- Created: 2026-02-28
-- Run this in the Supabase SQL Editor at https://supabase.com/dashboard/project/hsuqduzndegemopwossk/sql

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS end_time text,
  ADD COLUMN IF NOT EXISTS address text;

COMMENT ON COLUMN events.source_type IS 'Origin: google_calendar | ical | eventbrite | user_submitted | manual';
