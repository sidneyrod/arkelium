-- Create job-photos bucket for before/after photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-photos', 'job-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to job-photos bucket
CREATE POLICY "Authenticated users can upload job photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'job-photos');

-- Allow authenticated users in the same company to view job photos
CREATE POLICY "Authenticated users can view job photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'job-photos');

-- Allow admin/manager to delete job photos
CREATE POLICY "Admin/Manager can delete job photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'job-photos' AND public.is_admin_or_manager());