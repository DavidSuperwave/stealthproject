-- Supabase Storage Setup for Jaime Project Video Uploads
-- Creates bucket and policies for video storage

-- Enable Storage extension (usually already enabled)
-- CREATE EXTENSION IF NOT EXISTS "storage";

-- Create the videos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'videos',
  'videos',
  true,
  89128960,  -- 85MB limit per file
  ARRAY['video/mp4', 'video/quicktime', 'video/webm', 'video/avi']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 89128960,
  allowed_mime_types = ARRAY['video/mp4', 'video/quicktime', 'video/webm', 'video/avi'];

-- Policy: Allow authenticated users to upload videos
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'videos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Allow authenticated users to read their own videos
CREATE POLICY "Allow users to read own videos" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'videos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Allow authenticated users to delete their own videos
CREATE POLICY "Allow users to delete own videos" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'videos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Create index for faster queries (optional - can skip if causes issues)
-- Note: This index helps performance but isn't strictly required
-- CREATE INDEX IF NOT EXISTS idx_storage_objects_videos_owner 
-- ON storage.objects USING btree (bucket_id, ((storage.foldername(name)))[1]);

-- Comment
COMMENT ON TABLE storage.objects IS 'Video uploads for Jaime Project';
