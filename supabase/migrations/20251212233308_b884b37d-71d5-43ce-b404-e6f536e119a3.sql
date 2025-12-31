-- Create storage bucket for job photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-photos', 'job-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload photos
DROP POLICY IF EXISTS "Users can upload job photos" ON storage.objects;
CREATE POLICY "Users can upload job photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'job-photos' 
  AND auth.uid() IS NOT NULL
);

-- Allow authenticated users to view their job photos
DROP POLICY IF EXISTS "Users can view job photos" ON storage.objects;
CREATE POLICY "Users can view job photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'job-photos');

-- Allow authenticated users to delete their job photos
DROP POLICY IF EXISTS "Users can delete job photos" ON storage.objects;
CREATE POLICY "Users can delete job photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'job-photos' 
  AND auth.uid() IS NOT NULL
);