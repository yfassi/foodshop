-- ============================================
-- 016 - STOCK MODULE (add-on)
-- ============================================

-- ---- Subscription / add-on gating on restaurants ----
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS stock_addon_active BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stock_enabled BOOLEAN NOT NULL DEFAULT false;

-- ---- Enums ----
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_unit') THEN
    CREATE TYPE stock_unit AS ENUM ('kg', 'g', 'L', 'ml', 'pcs', 'cartons');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_movement_type') THEN
    CREATE TYPE stock_movement_type AS ENUM ('in', 'out', 'adjustment');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_receipt_status') THEN
    CREATE TYPE stock_receipt_status AS ENUM ('pending', 'processed', 'confirmed', 'failed');
  END IF;
END $$;

-- ---- stock_items ----
CREATE TABLE IF NOT EXISTS public.stock_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit stock_unit NOT NULL,
  current_qty NUMERIC(12,3) NOT NULL DEFAULT 0,
  reorder_threshold NUMERIC(12,3),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_stock_items_restaurant ON public.stock_items(restaurant_id);

DROP TRIGGER IF EXISTS set_stock_items_updated_at ON public.stock_items;
CREATE TRIGGER set_stock_items_updated_at
  BEFORE UPDATE ON public.stock_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---- stock_receipts (scanned tickets/invoices) ----
CREATE TABLE IF NOT EXISTS public.stock_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  status stock_receipt_status NOT NULL DEFAULT 'pending',
  ocr_data JSONB,
  supplier_name TEXT,
  receipt_date DATE,
  total_amount_cents INTEGER,
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_stock_receipts_restaurant_created
  ON public.stock_receipts(restaurant_id, created_at DESC);

DROP TRIGGER IF EXISTS set_stock_receipts_updated_at ON public.stock_receipts;
CREATE TRIGGER set_stock_receipts_updated_at
  BEFORE UPDATE ON public.stock_receipts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---- stock_movements ----
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  stock_item_id UUID NOT NULL REFERENCES public.stock_items(id) ON DELETE CASCADE,
  type stock_movement_type NOT NULL,
  quantity NUMERIC(12,3) NOT NULL,
  reason TEXT,
  receipt_id UUID REFERENCES public.stock_receipts(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_restaurant_created
  ON public.stock_movements(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item_created
  ON public.stock_movements(stock_item_id, created_at DESC);

-- ---- Trigger: apply movement delta to stock_items.current_qty ----
CREATE OR REPLACE FUNCTION apply_stock_movement() RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.stock_items
  SET current_qty = current_qty + NEW.quantity,
      updated_at = now()
  WHERE id = NEW.stock_item_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_apply_stock_movement ON public.stock_movements;
CREATE TRIGGER trg_apply_stock_movement
  AFTER INSERT ON public.stock_movements
  FOR EACH ROW EXECUTE FUNCTION apply_stock_movement();

-- ---- RLS ----
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_receipts ENABLE ROW LEVEL SECURITY;

-- stock_items: owner full CRUD
DROP POLICY IF EXISTS "Owner: read stock_items" ON public.stock_items;
DROP POLICY IF EXISTS "Owner: insert stock_items" ON public.stock_items;
DROP POLICY IF EXISTS "Owner: update stock_items" ON public.stock_items;
DROP POLICY IF EXISTS "Owner: delete stock_items" ON public.stock_items;
CREATE POLICY "Owner: read stock_items" ON public.stock_items FOR SELECT
  USING (restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
  ));
CREATE POLICY "Owner: insert stock_items" ON public.stock_items FOR INSERT
  WITH CHECK (restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
  ));
CREATE POLICY "Owner: update stock_items" ON public.stock_items FOR UPDATE
  USING (restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
  ));
CREATE POLICY "Owner: delete stock_items" ON public.stock_items FOR DELETE
  USING (restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
  ));

-- stock_movements: owner full CRUD
DROP POLICY IF EXISTS "Owner: read stock_movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Owner: insert stock_movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Owner: update stock_movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Owner: delete stock_movements" ON public.stock_movements;
CREATE POLICY "Owner: read stock_movements" ON public.stock_movements FOR SELECT
  USING (restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
  ));
CREATE POLICY "Owner: insert stock_movements" ON public.stock_movements FOR INSERT
  WITH CHECK (restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
  ));
CREATE POLICY "Owner: update stock_movements" ON public.stock_movements FOR UPDATE
  USING (restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
  ));
CREATE POLICY "Owner: delete stock_movements" ON public.stock_movements FOR DELETE
  USING (restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
  ));

-- stock_receipts: owner full CRUD
DROP POLICY IF EXISTS "Owner: read stock_receipts" ON public.stock_receipts;
DROP POLICY IF EXISTS "Owner: insert stock_receipts" ON public.stock_receipts;
DROP POLICY IF EXISTS "Owner: update stock_receipts" ON public.stock_receipts;
DROP POLICY IF EXISTS "Owner: delete stock_receipts" ON public.stock_receipts;
CREATE POLICY "Owner: read stock_receipts" ON public.stock_receipts FOR SELECT
  USING (restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
  ));
CREATE POLICY "Owner: insert stock_receipts" ON public.stock_receipts FOR INSERT
  WITH CHECK (restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
  ));
CREATE POLICY "Owner: update stock_receipts" ON public.stock_receipts FOR UPDATE
  USING (restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
  ));
CREATE POLICY "Owner: delete stock_receipts" ON public.stock_receipts FOR DELETE
  USING (restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
  ));

-- ---- Realtime (idempotent) ----
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'stock_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_items;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'stock_movements'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_movements;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'stock_receipts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_receipts;
  END IF;
END $$;

-- ---- Storage bucket for scanned receipts ----
INSERT INTO storage.buckets (id, name, public)
VALUES ('stock-receipts', 'stock-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: owners can read/write/delete in their restaurant prefix
DROP POLICY IF EXISTS "Owner: read stock-receipts" ON storage.objects;
DROP POLICY IF EXISTS "Owner: insert stock-receipts" ON storage.objects;
DROP POLICY IF EXISTS "Owner: delete stock-receipts" ON storage.objects;

CREATE POLICY "Owner: read stock-receipts" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'stock-receipts'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.restaurants WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Owner: insert stock-receipts" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'stock-receipts'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.restaurants WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Owner: delete stock-receipts" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'stock-receipts'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.restaurants WHERE owner_id = auth.uid()
    )
  );
