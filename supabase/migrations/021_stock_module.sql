-- ============================================
-- 019 - STOCK MODULE
-- ============================================
-- Stock add-on : OCR sur tickets de livraison, recettes & décrément auto,
-- alertes seuil bas (push à 11h). Activé via abonnement Stripe (12€/mois).
-- Les flags stock_module_active / stock_enabled sont posés en migration 016 ;
-- ici on ajoute la config + tracking d'abonnement et toutes les tables métier.
-- ============================================

-- ---- 1. Restaurant: stock config + Stripe subscription tracking ----
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS stock_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS stock_stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stock_subscription_status TEXT;

-- stock_config shape:
-- {
--   "default_low_threshold_pct": 0.2,   -- pour les nouveaux ingrédients
--   "alert_hour_local": 11,              -- heure d'envoi des alertes (0-23, fuseau Europe/Paris)
--   "alert_push_enabled": true
-- }

-- ---- 2. Suppliers (fournisseurs) ----
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_restaurant ON public.suppliers(restaurant_id);

CREATE TRIGGER set_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---- 3. Ingredients ----
CREATE TABLE IF NOT EXISTS public.ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT,                       -- libellé libre : "Légumes", "Viandes"…
  unit TEXT NOT NULL DEFAULT 'piece'
    CHECK (unit IN ('kg', 'g', 'l', 'ml', 'piece')),
  current_qty NUMERIC(12, 3) NOT NULL DEFAULT 0,
  low_threshold NUMERIC(12, 3) NOT NULL DEFAULT 0,
  cost_per_unit_cents INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ingredients_restaurant ON public.ingredients(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_resto_qty ON public.ingredients(restaurant_id, current_qty);
CREATE INDEX IF NOT EXISTS idx_ingredients_supplier ON public.ingredients(supplier_id);

CREATE TRIGGER set_ingredients_updated_at
  BEFORE UPDATE ON public.ingredients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---- 4. Recipes (1 par produit) ----
CREATE TABLE IF NOT EXISTS public.recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL UNIQUE REFERENCES public.products(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recipes_restaurant ON public.recipes(restaurant_id);

CREATE TRIGGER set_recipes_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---- 5. Recipe items (n ingrédients par recette) ----
CREATE TABLE IF NOT EXISTS public.recipe_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE RESTRICT,
  quantity NUMERIC(12, 3) NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(recipe_id, ingredient_id)
);

CREATE INDEX IF NOT EXISTS idx_recipe_items_recipe ON public.recipe_items(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_items_ingredient ON public.recipe_items(ingredient_id);

-- ---- 6. Stock movements (journal) ----
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  delta NUMERIC(12, 3) NOT NULL,        -- positif = entrée, négatif = sortie
  reason TEXT NOT NULL CHECK (reason IN (
    'scan_in', 'order_consumption', 'manual_adjust', 'loss', 'opening'
  )),
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  delivery_scan_id UUID,                 -- FK ajoutée plus bas (cycle)
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_mov_restaurant ON public.stock_movements(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_mov_ingredient ON public.stock_movements(ingredient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_mov_order ON public.stock_movements(order_id);

-- ---- 7. Delivery scans (tickets OCRisés) ----
CREATE TABLE IF NOT EXISTS public.delivery_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  image_url TEXT,
  ocr_raw TEXT,
  parsed_items JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'validated', 'discarded')),
  total_cents INTEGER,
  scan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  validated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_scans_resto ON public.delivery_scans(restaurant_id, status, created_at DESC);

ALTER TABLE public.stock_movements
  ADD CONSTRAINT stock_movements_delivery_scan_fkey
  FOREIGN KEY (delivery_scan_id) REFERENCES public.delivery_scans(id) ON DELETE SET NULL;

-- ---- 8. Stock alerts log (idempotence) ----
CREATE TABLE IF NOT EXISTS public.stock_alerts_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  sent_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ingredient_id, sent_at)
);

CREATE INDEX IF NOT EXISTS idx_stock_alerts_resto ON public.stock_alerts_log(restaurant_id, sent_at DESC);

-- ---- 9. Stock order decrements (idempotence du trigger) ----
CREATE TABLE IF NOT EXISTS public.stock_order_decrements (
  order_id UUID PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- 10. RLS ----
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_alerts_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_order_decrements ENABLE ROW LEVEL SECURITY;

-- Pattern : owner has full CRUD on rows scoped to their restaurant.
-- Suppliers
CREATE POLICY "Owner: read suppliers" ON public.suppliers FOR SELECT
  USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));
CREATE POLICY "Owner: insert suppliers" ON public.suppliers FOR INSERT
  WITH CHECK (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));
CREATE POLICY "Owner: update suppliers" ON public.suppliers FOR UPDATE
  USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));
CREATE POLICY "Owner: delete suppliers" ON public.suppliers FOR DELETE
  USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

-- Ingredients
CREATE POLICY "Owner: read ingredients" ON public.ingredients FOR SELECT
  USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));
CREATE POLICY "Owner: insert ingredients" ON public.ingredients FOR INSERT
  WITH CHECK (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));
CREATE POLICY "Owner: update ingredients" ON public.ingredients FOR UPDATE
  USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));
CREATE POLICY "Owner: delete ingredients" ON public.ingredients FOR DELETE
  USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

-- Recipes
CREATE POLICY "Owner: read recipes" ON public.recipes FOR SELECT
  USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));
CREATE POLICY "Owner: insert recipes" ON public.recipes FOR INSERT
  WITH CHECK (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));
CREATE POLICY "Owner: update recipes" ON public.recipes FOR UPDATE
  USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));
CREATE POLICY "Owner: delete recipes" ON public.recipes FOR DELETE
  USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

-- Recipe items (scope via recipe.restaurant_id)
CREATE POLICY "Owner: read recipe_items" ON public.recipe_items FOR SELECT
  USING (recipe_id IN (
    SELECT id FROM public.recipes
    WHERE restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
  ));
CREATE POLICY "Owner: insert recipe_items" ON public.recipe_items FOR INSERT
  WITH CHECK (recipe_id IN (
    SELECT id FROM public.recipes
    WHERE restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
  ));
CREATE POLICY "Owner: update recipe_items" ON public.recipe_items FOR UPDATE
  USING (recipe_id IN (
    SELECT id FROM public.recipes
    WHERE restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
  ));
CREATE POLICY "Owner: delete recipe_items" ON public.recipe_items FOR DELETE
  USING (recipe_id IN (
    SELECT id FROM public.recipes
    WHERE restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
  ));

-- Stock movements
CREATE POLICY "Owner: read stock_movements" ON public.stock_movements FOR SELECT
  USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));
CREATE POLICY "Owner: insert stock_movements" ON public.stock_movements FOR INSERT
  WITH CHECK (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

-- Delivery scans
CREATE POLICY "Owner: read delivery_scans" ON public.delivery_scans FOR SELECT
  USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));
CREATE POLICY "Owner: insert delivery_scans" ON public.delivery_scans FOR INSERT
  WITH CHECK (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));
CREATE POLICY "Owner: update delivery_scans" ON public.delivery_scans FOR UPDATE
  USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));
CREATE POLICY "Owner: delete delivery_scans" ON public.delivery_scans FOR DELETE
  USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

-- Stock alerts log (read only for owners; writes are server-side only)
CREATE POLICY "Owner: read stock_alerts_log" ON public.stock_alerts_log FOR SELECT
  USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

-- stock_order_decrements: pas de policy owner (table interne, alimentée via trigger)
-- → aucune policy = aucun accès en RLS sauf via service role.

-- ---- 11. Decrement trigger ----
-- Quand une commande passe en 'preparing' (kitchen accepte), on déduit les ingrédients
-- des recettes correspondantes. Idempotent via stock_order_decrements (PK order_id).
CREATE OR REPLACE FUNCTION public.decrement_stock_for_order()
RETURNS TRIGGER AS $$
DECLARE
  module_active BOOLEAN;
  module_enabled BOOLEAN;
  item JSONB;
  product_uuid UUID;
  item_qty NUMERIC;
  recipe_uuid UUID;
  ri RECORD;
  total_delta NUMERIC;
BEGIN
  -- Only act on transition to 'preparing'
  IF NEW.status IS DISTINCT FROM 'preparing' THEN
    RETURN NEW;
  END IF;
  IF OLD.status = 'preparing' THEN
    RETURN NEW;
  END IF;

  -- Bail if stock module isn't enabled on this restaurant
  SELECT stock_module_active, stock_enabled
    INTO module_active, module_enabled
    FROM public.restaurants WHERE id = NEW.restaurant_id;
  IF NOT COALESCE(module_active, false) OR NOT COALESCE(module_enabled, false) THEN
    RETURN NEW;
  END IF;

  -- Idempotence
  IF EXISTS (SELECT 1 FROM public.stock_order_decrements WHERE order_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- For each line in items[]
  FOR item IN SELECT jsonb_array_elements(COALESCE(NEW.items, '[]'::jsonb)) LOOP
    BEGIN
      product_uuid := (item->>'product_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
      CONTINUE;
    END;
    item_qty := COALESCE((item->>'quantity')::NUMERIC, 1);

    SELECT id INTO recipe_uuid FROM public.recipes
      WHERE product_id = product_uuid AND is_enabled = true;
    IF recipe_uuid IS NULL THEN
      CONTINUE;
    END IF;

    FOR ri IN
      SELECT ingredient_id, quantity FROM public.recipe_items
      WHERE recipe_id = recipe_uuid
    LOOP
      total_delta := -1 * ri.quantity * item_qty;
      UPDATE public.ingredients
        SET current_qty = current_qty + total_delta
        WHERE id = ri.ingredient_id;
      INSERT INTO public.stock_movements
        (restaurant_id, ingredient_id, delta, reason, order_id)
      VALUES
        (NEW.restaurant_id, ri.ingredient_id, total_delta, 'order_consumption', NEW.id);
    END LOOP;

    recipe_uuid := NULL;
  END LOOP;

  INSERT INTO public.stock_order_decrements (order_id) VALUES (NEW.id)
    ON CONFLICT (order_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS decrement_stock_on_order_status ON public.orders;
CREATE TRIGGER decrement_stock_on_order_status
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.decrement_stock_for_order();

-- ---- 12. Realtime ----
ALTER PUBLICATION supabase_realtime ADD TABLE public.ingredients;
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_scans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_movements;
