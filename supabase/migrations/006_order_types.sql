-- Order types: dine-in ("sur place") and takeaway ("à emporter")

-- Restaurant setting: which order types are accepted
ALTER TABLE public.restaurants
  ADD COLUMN order_types JSONB NOT NULL DEFAULT '["dine_in","takeaway"]'::jsonb;

-- Order-level: which type was chosen by the customer
ALTER TABLE public.orders
  ADD COLUMN order_type TEXT;
