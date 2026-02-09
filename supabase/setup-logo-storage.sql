-- Create the restaurant-logos storage bucket (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('restaurant-logos', 'restaurant-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read restaurant logos (public bucket)
CREATE POLICY "Public read restaurant logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'restaurant-logos');

-- Allow authenticated users to upload restaurant logos
CREATE POLICY "Authenticated users can upload restaurant logos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'restaurant-logos'
    AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to update (overwrite) their restaurant logos
CREATE POLICY "Authenticated users can update restaurant logos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'restaurant-logos'
    AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to delete their restaurant logos
CREATE POLICY "Authenticated users can delete restaurant logos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'restaurant-logos'
    AND auth.role() = 'authenticated'
  );
