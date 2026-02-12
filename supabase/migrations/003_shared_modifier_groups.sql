-- Shared modifier groups (restaurant-level reusable sections like "Sauces", "Protéines")
CREATE TABLE shared_modifier_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  min_select INTEGER NOT NULL DEFAULT 0,
  max_select INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Shared modifiers (items within shared groups)
CREATE TABLE shared_modifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES shared_modifier_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_extra INTEGER NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Junction table: links products to shared modifier groups
CREATE TABLE product_shared_groups (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  shared_group_id UUID NOT NULL REFERENCES shared_modifier_groups(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, shared_group_id)
);

-- Enable RLS
ALTER TABLE shared_modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_shared_groups ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read shared_modifier_groups"
  ON shared_modifier_groups FOR SELECT USING (true);
CREATE POLICY "Public read shared_modifiers"
  ON shared_modifiers FOR SELECT USING (true);
CREATE POLICY "Public read product_shared_groups"
  ON product_shared_groups FOR SELECT USING (true);

-- Owner write access
CREATE POLICY "Owner manage shared_modifier_groups"
  ON shared_modifier_groups FOR ALL
  USING (restaurant_id IN (
    SELECT id FROM restaurants WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Owner manage shared_modifiers"
  ON shared_modifiers FOR ALL
  USING (group_id IN (
    SELECT id FROM shared_modifier_groups
    WHERE restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  ));

CREATE POLICY "Owner manage product_shared_groups"
  ON product_shared_groups FOR ALL
  USING (product_id IN (
    SELECT p.id FROM products p
    JOIN categories c ON p.category_id = c.id
    JOIN restaurants r ON c.restaurant_id = r.id
    WHERE r.owner_id = auth.uid()
  ));
