-- Supabase Storage: Create 'logos' bucket for nonprofit/club logos
-- Run this in the Supabase SQL Editor

-- 1. Create the storage bucket (public so logos can be displayed without auth)
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow anyone to upload files to the logos bucket (max 2MB enforced client-side)
CREATE POLICY "Anyone can upload logos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'logos');

-- 3. Allow anyone to view/download logos (public bucket)
CREATE POLICY "Anyone can view logos"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'logos');
