-- Create the product-images storage bucket (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read product images (public bucket)
CREATE POLICY "Public read product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

-- Allow authenticated users to upload product images
CREATE POLICY "Authenticated users can upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images'
    AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to update (overwrite) their product images
CREATE POLICY "Authenticated users can update product images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'product-images'
    AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to delete their product images
CREATE POLICY "Authenticated users can delete product images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'product-images'
    AND auth.role() = 'authenticated'
  );
