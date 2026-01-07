-- Add logo_url column to projects table
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Create storage bucket for project assets if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-assets', 'project-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for project-assets bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'project-assets' );

CREATE POLICY "Authenticated users can upload project assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-assets'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own project assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'project-assets'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own project assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'project-assets'
  AND auth.role() = 'authenticated'
);
