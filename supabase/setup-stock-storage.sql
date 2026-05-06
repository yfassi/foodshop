-- ============================================
-- STOCK RECEIPTS BUCKET (delivery tickets / OCR scans)
-- ============================================
-- Idempotent : peut être ré-exécuté sans erreur.

INSERT INTO storage.buckets (id, name, public)
VALUES ('stock-receipts', 'stock-receipts', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read stock receipts" ON storage.objects;
CREATE POLICY "Public read stock receipts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'stock-receipts');

DROP POLICY IF EXISTS "Authenticated users can upload stock receipts" ON storage.objects;
CREATE POLICY "Authenticated users can upload stock receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'stock-receipts'
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Authenticated users can update stock receipts" ON storage.objects;
CREATE POLICY "Authenticated users can update stock receipts"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'stock-receipts'
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Authenticated users can delete stock receipts" ON storage.objects;
CREATE POLICY "Authenticated users can delete stock receipts"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'stock-receipts'
    AND auth.role() = 'authenticated'
  );
