-- Deals Self-Publish Feature Migration
-- Run in Supabase SQL Editor.
-- Extends `affiliates` (the table powering the Deals tab) so businesses can submit
-- their own deal cards (image or PDF) — pending admin approval.

-- 1. Add new columns to affiliates
ALTER TABLE affiliates
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS submitted_by_email text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS business_id integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS town_id integer DEFAULT NULL;

-- Existing rows have payment_status = NULL → treated as active by the
-- public-query filter `.or('payment_status.eq.active,payment_status.is.null')`.
-- No data migration required.

-- 2. Indexes for the admin pending-queue and town-scoped lookup
CREATE INDEX IF NOT EXISTS idx_affiliates_payment_status ON affiliates(payment_status);
CREATE INDEX IF NOT EXISTS idx_affiliates_town_id ON affiliates(town_id);

-- 3. Storage bucket for deal images / PDFs (public reads, authenticated uploads only)
INSERT INTO storage.buckets (id, name, public)
VALUES ('deals', 'deals', true)
ON CONFLICT (id) DO NOTHING;

-- MIME-type and size restrictions on the bucket
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif','application/pdf'],
    file_size_limit = 5242880
WHERE id = 'deals';

-- Bucket policies — only authenticated users may upload
DROP POLICY IF EXISTS "Anyone can upload deals" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload deals" ON storage.objects;
CREATE POLICY "Authenticated can upload deals"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'deals');

DROP POLICY IF EXISTS "Anyone can view deals" ON storage.objects;
CREATE POLICY "Anyone can view deals"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'deals');

-- 4. RLS on affiliates so the anon key cannot bypass admin moderation
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;

-- Drop pre-existing open SELECT policy that bypasses our column-level filters
DROP POLICY IF EXISTS "affiliates_select" ON affiliates;

DROP POLICY IF EXISTS "affiliates_public_read" ON affiliates;
CREATE POLICY "affiliates_public_read" ON affiliates
  FOR SELECT
  USING (is_active = true AND (payment_status = 'active' OR payment_status IS NULL));

-- Admin reads all rows including pending/rejected
DROP POLICY IF EXISTS "affiliates_admin_read" ON affiliates;
CREATE POLICY "affiliates_admin_read" ON affiliates
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') IN (
      'jarrettcmcgee@gmail.com',
      'jarrettmcgee@gmail.com',
      'thenewpaperchariton@gmail.com',
      'gonewpaper@gmail.com'
    )
  );

-- Authenticated users may submit deals — must start as pending + inactive
DROP POLICY IF EXISTS "affiliates_authenticated_submit" ON affiliates;
CREATE POLICY "affiliates_authenticated_submit" ON affiliates
  FOR INSERT
  TO authenticated
  WITH CHECK (payment_status = 'pending' AND is_active = false);

-- Only admins may approve/reject (UPDATE)
DROP POLICY IF EXISTS "affiliates_admin_update" ON affiliates;
CREATE POLICY "affiliates_admin_update" ON affiliates
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') IN (
      'jarrettcmcgee@gmail.com',
      'jarrettmcgee@gmail.com',
      'thenewpaperchariton@gmail.com',
      'gonewpaper@gmail.com'
    )
  )
  WITH CHECK (
    (auth.jwt() ->> 'email') IN (
      'jarrettcmcgee@gmail.com',
      'jarrettmcgee@gmail.com',
      'thenewpaperchariton@gmail.com',
      'gonewpaper@gmail.com'
    )
  );

-- Only admins may delete
DROP POLICY IF EXISTS "affiliates_admin_delete" ON affiliates;
CREATE POLICY "affiliates_admin_delete" ON affiliates
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') IN (
      'jarrettcmcgee@gmail.com',
      'jarrettmcgee@gmail.com',
      'thenewpaperchariton@gmail.com',
      'gonewpaper@gmail.com'
    )
  );
