-- Restaurant verification: KBIS / ownership document upload
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS verification_document_url TEXT;

-- Storage bucket for verification documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-documents', 'verification-documents', true)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "Public read verification documents"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'verification-documents');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can upload verification documents"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'verification-documents'
      AND auth.role() = 'authenticated'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can delete verification documents"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'verification-documents'
      AND auth.role() = 'authenticated'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
