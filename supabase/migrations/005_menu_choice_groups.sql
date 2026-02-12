-- Dynamic menu composition: groups of products offered in a menu formula
CREATE TABLE public.menu_choice_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Accompagnement',
  min_select INTEGER NOT NULL DEFAULT 1,
  max_select INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_menu_choice_groups_product ON public.menu_choice_groups(product_id);

CREATE TABLE public.menu_choice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.menu_choice_groups(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_menu_choice_items_group ON public.menu_choice_items(group_id);

-- RLS
ALTER TABLE public.menu_choice_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_choice_items ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Public: read menu_choice_groups" ON public.menu_choice_groups FOR SELECT USING (true);
CREATE POLICY "Public: read menu_choice_items" ON public.menu_choice_items FOR SELECT USING (true);

-- Owner: manage menu_choice_groups
CREATE POLICY "Owner: insert menu_choice_groups" ON public.menu_choice_groups FOR INSERT
  WITH CHECK (product_id IN (
    SELECT p.id FROM public.products p JOIN public.categories c ON c.id = p.category_id JOIN public.restaurants r ON r.id = c.restaurant_id WHERE r.owner_id = auth.uid()
  ));
CREATE POLICY "Owner: update menu_choice_groups" ON public.menu_choice_groups FOR UPDATE
  USING (product_id IN (
    SELECT p.id FROM public.products p JOIN public.categories c ON c.id = p.category_id JOIN public.restaurants r ON r.id = c.restaurant_id WHERE r.owner_id = auth.uid()
  ));
CREATE POLICY "Owner: delete menu_choice_groups" ON public.menu_choice_groups FOR DELETE
  USING (product_id IN (
    SELECT p.id FROM public.products p JOIN public.categories c ON c.id = p.category_id JOIN public.restaurants r ON r.id = c.restaurant_id WHERE r.owner_id = auth.uid()
  ));

-- Owner: manage menu_choice_items
CREATE POLICY "Owner: insert menu_choice_items" ON public.menu_choice_items FOR INSERT
  WITH CHECK (group_id IN (
    SELECT mcg.id FROM public.menu_choice_groups mcg JOIN public.products p ON p.id = mcg.product_id JOIN public.categories c ON c.id = p.category_id JOIN public.restaurants r ON r.id = c.restaurant_id WHERE r.owner_id = auth.uid()
  ));
CREATE POLICY "Owner: update menu_choice_items" ON public.menu_choice_items FOR UPDATE
  USING (group_id IN (
    SELECT mcg.id FROM public.menu_choice_groups mcg JOIN public.products p ON p.id = mcg.product_id JOIN public.categories c ON c.id = p.category_id JOIN public.restaurants r ON r.id = c.restaurant_id WHERE r.owner_id = auth.uid()
  ));
CREATE POLICY "Owner: delete menu_choice_items" ON public.menu_choice_items FOR DELETE
  USING (group_id IN (
    SELECT mcg.id FROM public.menu_choice_groups mcg JOIN public.products p ON p.id = mcg.product_id JOIN public.categories c ON c.id = p.category_id JOIN public.restaurants r ON r.id = c.restaurant_id WHERE r.owner_id = auth.uid()
  ));
