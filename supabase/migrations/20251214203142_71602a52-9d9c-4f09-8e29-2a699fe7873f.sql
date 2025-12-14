-- Make job-photos bucket private and update RLS policies
UPDATE storage.buckets SET public = false WHERE id = 'job-photos';

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view job photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload job photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own job photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own job photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own job photos" ON storage.objects;

-- Create new owner-scoped policies using folder structure {userId}/{filename}
CREATE POLICY "Users can view their own job photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'job-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own job photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'job-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own job photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'job-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);