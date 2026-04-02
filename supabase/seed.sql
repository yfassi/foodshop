-- ============================================
-- SEED DATA: "Chez Momo" - Kebab/Tacos/Burgers
-- ============================================
-- Note: Apres avoir cree un user admin dans Supabase Auth,
-- mettez a jour le owner_id du restaurant avec l'UUID de cet utilisateur.

INSERT INTO public.restaurants (id, name, slug, description, address, phone, is_accepting_orders)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Chez Momo',
  'chez-momo',
  'Le meilleur kebab de la ville depuis 2010. Tacos, burgers et kebabs faits maison.',
  '42 Rue de la Republique, 69001 Lyon',
  '+33 4 72 00 00 00',
  true
);

-- ============================================
-- CATEGORIES
-- ============================================
INSERT INTO public.categories (id, name, restaurant_id, sort_order) VALUES
  ('c0000001-0000-0000-0000-000000000000', 'Tacos', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 1),
  ('c0000002-0000-0000-0000-000000000000', 'Kebabs', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 2),
  ('c0000003-0000-0000-0000-000000000000', 'Burgers', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 3),
  ('c0000004-0000-0000-0000-000000000000', 'Accompagnements', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 4),
  ('c0000005-0000-0000-0000-000000000000', 'Boissons', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 5),
  ('c0000006-0000-0000-0000-000000000000', 'Desserts', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 6);

-- ============================================
-- PRODUCTS
-- ============================================

-- Tacos
INSERT INTO public.products (id, name, description, price, category_id, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000000', 'Tacos 1 Viande', 'Galette fraiche, une viande au choix, frites, fromage fondu', 750, 'c0000001-0000-0000-0000-000000000000', 1),
  ('d0000002-0000-0000-0000-000000000000', 'Tacos 2 Viandes', 'Galette fraiche, deux viandes au choix, frites, fromage fondu', 850, 'c0000001-0000-0000-0000-000000000000', 2),
  ('d0000003-0000-0000-0000-000000000000', 'Tacos 3 Viandes', 'Galette fraiche, trois viandes au choix, frites, fromage fondu', 950, 'c0000001-0000-0000-0000-000000000000', 3),
  ('d0000004-0000-0000-0000-000000000000', 'Tacos Geant', 'La galette XXL, trois viandes, double fromage, frites', 1150, 'c0000001-0000-0000-0000-000000000000', 4);

-- Kebabs
INSERT INTO public.products (id, name, description, price, category_id, sort_order) VALUES
  ('d0000005-0000-0000-0000-000000000000', 'Kebab Classique', 'Pain pita, viande a la broche, salade, tomates, oignons, sauce au choix', 700, 'c0000002-0000-0000-0000-000000000000', 1),
  ('d0000006-0000-0000-0000-000000000000', 'Kebab Assiette', 'Viande a la broche, frites, salade composee, sauce au choix', 950, 'c0000002-0000-0000-0000-000000000000', 2),
  ('d0000007-0000-0000-0000-000000000000', 'Durum', 'Galette fine, viande a la broche, salade, tomates, sauce au choix', 750, 'c0000002-0000-0000-0000-000000000000', 3);

-- Burgers
INSERT INTO public.products (id, name, description, price, category_id, sort_order) VALUES
  ('d0000008-0000-0000-0000-000000000000', 'Cheese Burger', 'Steak hache, cheddar, salade, tomates, ketchup', 650, 'c0000003-0000-0000-0000-000000000000', 1),
  ('d0000009-0000-0000-0000-000000000000', 'Double Cheese', 'Double steak, double cheddar, salade, tomates, sauce maison', 900, 'c0000003-0000-0000-0000-000000000000', 2),
  ('d0000010-0000-0000-0000-000000000000', 'Burger Chicken', 'Poulet croustillant, salade, tomates, sauce blanche', 800, 'c0000003-0000-0000-0000-000000000000', 3);

-- Accompagnements
INSERT INTO public.products (id, name, description, price, category_id, sort_order) VALUES
  ('d0000011-0000-0000-0000-000000000000', 'Frites', 'Portion de frites croustillantes', 300, 'c0000004-0000-0000-0000-000000000000', 1),
  ('d0000012-0000-0000-0000-000000000000', 'Frites Cheddar', 'Frites nappees de cheddar fondu', 450, 'c0000004-0000-0000-0000-000000000000', 2),
  ('d0000013-0000-0000-0000-000000000000', 'Nuggets x6', 'Nuggets de poulet croustillants', 400, 'c0000004-0000-0000-0000-000000000000', 3);

-- Boissons
INSERT INTO public.products (id, name, description, price, category_id, sort_order) VALUES
  ('d0000014-0000-0000-0000-000000000000', 'Coca-Cola 33cl', NULL, 200, 'c0000005-0000-0000-0000-000000000000', 1),
  ('d0000015-0000-0000-0000-000000000000', 'Orangina 33cl', NULL, 200, 'c0000005-0000-0000-0000-000000000000', 2),
  ('d0000016-0000-0000-0000-000000000000', 'Eau Minerale 50cl', NULL, 150, 'c0000005-0000-0000-0000-000000000000', 3),
  ('d0000017-0000-0000-0000-000000000000', 'Ayran', NULL, 200, 'c0000005-0000-0000-0000-000000000000', 4),
  ('d0000018-0000-0000-0000-000000000000', 'Ice Tea 33cl', NULL, 200, 'c0000005-0000-0000-0000-000000000000', 5);

-- Desserts
INSERT INTO public.products (id, name, description, price, category_id, sort_order) VALUES
  ('d0000019-0000-0000-0000-000000000000', 'Tiramisu', 'Tiramisu fait maison', 350, 'c0000006-0000-0000-0000-000000000000', 1),
  ('d0000020-0000-0000-0000-000000000000', 'Baklava x3', 'Patisseries orientales au miel', 300, 'c0000006-0000-0000-0000-000000000000', 2);

-- ============================================
-- MODIFIER GROUPS & MODIFIERS
-- ============================================

-- TACOS 1 VIANDE: Choix viande (1 obligatoire)
INSERT INTO public.modifier_groups (id, name, product_id, min_select, max_select, sort_order) VALUES
  ('ef000001-0000-0000-0000-000000000000', 'Choix de viande', 'd0000001-0000-0000-0000-000000000000', 1, 1, 1);
INSERT INTO public.modifiers (name, price_extra, group_id, sort_order) VALUES
  ('Poulet', 0, 'ef000001-0000-0000-0000-000000000000', 1),
  ('Viande hachee', 0, 'ef000001-0000-0000-0000-000000000000', 2),
  ('Tenders', 0, 'ef000001-0000-0000-0000-000000000000', 3),
  ('Cordon bleu', 0, 'ef000001-0000-0000-0000-000000000000', 4),
  ('Merguez', 0, 'ef000001-0000-0000-0000-000000000000', 5);

-- TACOS 2 VIANDES: Choix viandes (2 obligatoires)
INSERT INTO public.modifier_groups (id, name, product_id, min_select, max_select, sort_order) VALUES
  ('ef000002-0000-0000-0000-000000000000', 'Choix de viandes (2)', 'd0000002-0000-0000-0000-000000000000', 2, 2, 1);
INSERT INTO public.modifiers (name, price_extra, group_id, sort_order) VALUES
  ('Poulet', 0, 'ef000002-0000-0000-0000-000000000000', 1),
  ('Viande hachee', 0, 'ef000002-0000-0000-0000-000000000000', 2),
  ('Tenders', 0, 'ef000002-0000-0000-0000-000000000000', 3),
  ('Cordon bleu', 0, 'ef000002-0000-0000-0000-000000000000', 4),
  ('Merguez', 0, 'ef000002-0000-0000-0000-000000000000', 5);

-- TACOS 3 VIANDES: Choix viandes (3 obligatoires)
INSERT INTO public.modifier_groups (id, name, product_id, min_select, max_select, sort_order) VALUES
  ('ef000003-0000-0000-0000-000000000000', 'Choix de viandes (3)', 'd0000003-0000-0000-0000-000000000000', 3, 3, 1);
INSERT INTO public.modifiers (name, price_extra, group_id, sort_order) VALUES
  ('Poulet', 0, 'ef000003-0000-0000-0000-000000000000', 1),
  ('Viande hachee', 0, 'ef000003-0000-0000-0000-000000000000', 2),
  ('Tenders', 0, 'ef000003-0000-0000-0000-000000000000', 3),
  ('Cordon bleu', 0, 'ef000003-0000-0000-0000-000000000000', 4),
  ('Merguez', 0, 'ef000003-0000-0000-0000-000000000000', 5);

-- ALL TACOS: Sauce (1 obligatoire)
INSERT INTO public.modifier_groups (id, name, product_id, min_select, max_select, sort_order) VALUES
  ('ef000004-0000-0000-0000-000000000000', 'Sauce', 'd0000001-0000-0000-0000-000000000000', 1, 1, 2),
  ('ef000005-0000-0000-0000-000000000000', 'Sauce', 'd0000002-0000-0000-0000-000000000000', 1, 1, 2),
  ('ef000006-0000-0000-0000-000000000000', 'Sauce', 'd0000003-0000-0000-0000-000000000000', 1, 1, 2),
  ('ef000007-0000-0000-0000-000000000000', 'Sauce', 'd0000004-0000-0000-0000-000000000000', 1, 1, 1);

-- Sauces for each tacos sauce group
INSERT INTO public.modifiers (name, price_extra, group_id, sort_order) VALUES
  ('Samourai', 0, 'ef000004-0000-0000-0000-000000000000', 1),
  ('Algerienne', 0, 'ef000004-0000-0000-0000-000000000000', 2),
  ('Biggy Burger', 0, 'ef000004-0000-0000-0000-000000000000', 3),
  ('Blanche', 0, 'ef000004-0000-0000-0000-000000000000', 4),
  ('Barbecue', 0, 'ef000004-0000-0000-0000-000000000000', 5),
  ('Ketchup', 0, 'ef000004-0000-0000-0000-000000000000', 6),
  ('Andalouse', 0, 'ef000004-0000-0000-0000-000000000000', 7);

INSERT INTO public.modifiers (name, price_extra, group_id, sort_order) VALUES
  ('Samourai', 0, 'ef000005-0000-0000-0000-000000000000', 1),
  ('Algerienne', 0, 'ef000005-0000-0000-0000-000000000000', 2),
  ('Biggy Burger', 0, 'ef000005-0000-0000-0000-000000000000', 3),
  ('Blanche', 0, 'ef000005-0000-0000-0000-000000000000', 4),
  ('Barbecue', 0, 'ef000005-0000-0000-0000-000000000000', 5),
  ('Ketchup', 0, 'ef000005-0000-0000-0000-000000000000', 6),
  ('Andalouse', 0, 'ef000005-0000-0000-0000-000000000000', 7);

INSERT INTO public.modifiers (name, price_extra, group_id, sort_order) VALUES
  ('Samourai', 0, 'ef000006-0000-0000-0000-000000000000', 1),
  ('Algerienne', 0, 'ef000006-0000-0000-0000-000000000000', 2),
  ('Biggy Burger', 0, 'ef000006-0000-0000-0000-000000000000', 3),
  ('Blanche', 0, 'ef000006-0000-0000-0000-000000000000', 4),
  ('Barbecue', 0, 'ef000006-0000-0000-0000-000000000000', 5),
  ('Ketchup', 0, 'ef000006-0000-0000-0000-000000000000', 6),
  ('Andalouse', 0, 'ef000006-0000-0000-0000-000000000000', 7);

INSERT INTO public.modifiers (name, price_extra, group_id, sort_order) VALUES
  ('Samourai', 0, 'ef000007-0000-0000-0000-000000000000', 1),
  ('Algerienne', 0, 'ef000007-0000-0000-0000-000000000000', 2),
  ('Biggy Burger', 0, 'ef000007-0000-0000-0000-000000000000', 3),
  ('Blanche', 0, 'ef000007-0000-0000-0000-000000000000', 4),
  ('Barbecue', 0, 'ef000007-0000-0000-0000-000000000000', 5),
  ('Ketchup', 0, 'ef000007-0000-0000-0000-000000000000', 6),
  ('Andalouse', 0, 'ef000007-0000-0000-0000-000000000000', 7);

-- ALL TACOS: Supplements (optionnel, 0-3)
INSERT INTO public.modifier_groups (id, name, product_id, min_select, max_select, sort_order) VALUES
  ('ef000008-0000-0000-0000-000000000000', 'Supplements', 'd0000001-0000-0000-0000-000000000000', 0, 3, 3),
  ('ef000009-0000-0000-0000-000000000000', 'Supplements', 'd0000002-0000-0000-0000-000000000000', 0, 3, 3),
  ('ef000010-0000-0000-0000-000000000000', 'Supplements', 'd0000003-0000-0000-0000-000000000000', 0, 3, 3),
  ('ef000011-0000-0000-0000-000000000000', 'Supplements', 'd0000004-0000-0000-0000-000000000000', 0, 3, 2);

INSERT INTO public.modifiers (name, price_extra, group_id, sort_order) VALUES
  ('Double fromage', 150, 'ef000008-0000-0000-0000-000000000000', 1),
  ('Cheddar fondu', 150, 'ef000008-0000-0000-0000-000000000000', 2),
  ('Jalapenos', 100, 'ef000008-0000-0000-0000-000000000000', 3),
  ('Oeuf', 100, 'ef000008-0000-0000-0000-000000000000', 4),
  ('Viande supplementaire', 200, 'ef000008-0000-0000-0000-000000000000', 5);

INSERT INTO public.modifiers (name, price_extra, group_id, sort_order) VALUES
  ('Double fromage', 150, 'ef000009-0000-0000-0000-000000000000', 1),
  ('Cheddar fondu', 150, 'ef000009-0000-0000-0000-000000000000', 2),
  ('Jalapenos', 100, 'ef000009-0000-0000-0000-000000000000', 3),
  ('Oeuf', 100, 'ef000009-0000-0000-0000-000000000000', 4),
  ('Viande supplementaire', 200, 'ef000009-0000-0000-0000-000000000000', 5);

INSERT INTO public.modifiers (name, price_extra, group_id, sort_order) VALUES
  ('Double fromage', 150, 'ef000010-0000-0000-0000-000000000000', 1),
  ('Cheddar fondu', 150, 'ef000010-0000-0000-0000-000000000000', 2),
  ('Jalapenos', 100, 'ef000010-0000-0000-0000-000000000000', 3),
  ('Oeuf', 100, 'ef000010-0000-0000-0000-000000000000', 4),
  ('Viande supplementaire', 200, 'ef000010-0000-0000-0000-000000000000', 5);

INSERT INTO public.modifiers (name, price_extra, group_id, sort_order) VALUES
  ('Double fromage', 150, 'ef000011-0000-0000-0000-000000000000', 1),
  ('Cheddar fondu', 150, 'ef000011-0000-0000-0000-000000000000', 2),
  ('Jalapenos', 100, 'ef000011-0000-0000-0000-000000000000', 3),
  ('Oeuf', 100, 'ef000011-0000-0000-0000-000000000000', 4),
  ('Viande supplementaire', 200, 'ef000011-0000-0000-0000-000000000000', 5);

-- KEBABS: Sauce (obligatoire, 1 choix)
INSERT INTO public.modifier_groups (id, name, product_id, min_select, max_select, sort_order) VALUES
  ('ef000012-0000-0000-0000-000000000000', 'Sauce', 'd0000005-0000-0000-0000-000000000000', 1, 1, 1),
  ('ef000013-0000-0000-0000-000000000000', 'Sauce', 'd0000006-0000-0000-0000-000000000000', 1, 1, 1),
  ('ef000014-0000-0000-0000-000000000000', 'Sauce', 'd0000007-0000-0000-0000-000000000000', 1, 1, 1);

INSERT INTO public.modifiers (name, price_extra, group_id, sort_order) VALUES
  ('Blanche', 0, 'ef000012-0000-0000-0000-000000000000', 1),
  ('Samourai', 0, 'ef000012-0000-0000-0000-000000000000', 2),
  ('Algerienne', 0, 'ef000012-0000-0000-0000-000000000000', 3),
  ('Harissa', 0, 'ef000012-0000-0000-0000-000000000000', 4),
  ('Barbecue', 0, 'ef000012-0000-0000-0000-000000000000', 5);

INSERT INTO public.modifiers (name, price_extra, group_id, sort_order) VALUES
  ('Blanche', 0, 'ef000013-0000-0000-0000-000000000000', 1),
  ('Samourai', 0, 'ef000013-0000-0000-0000-000000000000', 2),
  ('Algerienne', 0, 'ef000013-0000-0000-0000-000000000000', 3),
  ('Harissa', 0, 'ef000013-0000-0000-0000-000000000000', 4),
  ('Barbecue', 0, 'ef000013-0000-0000-0000-000000000000', 5);

INSERT INTO public.modifiers (name, price_extra, group_id, sort_order) VALUES
  ('Blanche', 0, 'ef000014-0000-0000-0000-000000000000', 1),
  ('Samourai', 0, 'ef000014-0000-0000-0000-000000000000', 2),
  ('Algerienne', 0, 'ef000014-0000-0000-0000-000000000000', 3),
  ('Harissa', 0, 'ef000014-0000-0000-0000-000000000000', 4),
  ('Barbecue', 0, 'ef000014-0000-0000-0000-000000000000', 5);

-- KEBABS: Retirer (optionnel)
INSERT INTO public.modifier_groups (id, name, product_id, min_select, max_select, sort_order) VALUES
  ('ef000015-0000-0000-0000-000000000000', 'Retirer', 'd0000005-0000-0000-0000-000000000000', 0, 4, 2),
  ('ef000016-0000-0000-0000-000000000000', 'Retirer', 'd0000007-0000-0000-0000-000000000000', 0, 4, 2);

INSERT INTO public.modifiers (name, price_extra, group_id, sort_order) VALUES
  ('Sans salade', 0, 'ef000015-0000-0000-0000-000000000000', 1),
  ('Sans tomates', 0, 'ef000015-0000-0000-0000-000000000000', 2),
  ('Sans oignons', 0, 'ef000015-0000-0000-0000-000000000000', 3),
  ('Sans piment', 0, 'ef000015-0000-0000-0000-000000000000', 4);

INSERT INTO public.modifiers (name, price_extra, group_id, sort_order) VALUES
  ('Sans salade', 0, 'ef000016-0000-0000-0000-000000000000', 1),
  ('Sans tomates', 0, 'ef000016-0000-0000-0000-000000000000', 2),
  ('Sans oignons', 0, 'ef000016-0000-0000-0000-000000000000', 3),
  ('Sans piment', 0, 'ef000016-0000-0000-0000-000000000000', 4);

-- BURGERS: Supplements (optionnel)
INSERT INTO public.modifier_groups (id, name, product_id, min_select, max_select, sort_order) VALUES
  ('ef000017-0000-0000-0000-000000000000', 'Supplements', 'd0000008-0000-0000-0000-000000000000', 0, 3, 1),
  ('ef000018-0000-0000-0000-000000000000', 'Supplements', 'd0000009-0000-0000-0000-000000000000', 0, 3, 1);

INSERT INTO public.modifiers (name, price_extra, group_id, sort_order) VALUES
  ('Bacon', 150, 'ef000017-0000-0000-0000-000000000000', 1),
  ('Oeuf au plat', 100, 'ef000017-0000-0000-0000-000000000000', 2),
  ('Cheddar supplementaire', 100, 'ef000017-0000-0000-0000-000000000000', 3),
  ('Oignons frits', 100, 'ef000017-0000-0000-0000-000000000000', 4);

INSERT INTO public.modifiers (name, price_extra, group_id, sort_order) VALUES
  ('Bacon', 150, 'ef000018-0000-0000-0000-000000000000', 1),
  ('Oeuf au plat', 100, 'ef000018-0000-0000-0000-000000000000', 2),
  ('Cheddar supplementaire', 100, 'ef000018-0000-0000-0000-000000000000', 3),
  ('Oignons frits', 100, 'ef000018-0000-0000-0000-000000000000', 4);

-- ============================================
-- DEMO ORDERS
-- ============================================
-- Orders use now() so they always appear as "today" in the admin dashboard.
-- Mix of statuses, payment methods, and order types to populate
-- both the comptoir (counter) and cuisine (kitchen) views.

-- #1 — Comptoir: A encaisser (new, on_site, unpaid)
INSERT INTO public.orders (
  id, restaurant_id, customer_info, items, status, total_price,
  payment_method, order_type, paid, display_order_number, created_at
) VALUES (
  'aaaa0001-0000-0000-0000-000000000000',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '{"name": "Karim B.", "phone": "+33 6 12 34 56 78"}',
  '[
    {"product_id": "d0000001-0000-0000-0000-000000000000", "product_name": "Tacos 1 Viande", "quantity": 2, "unit_price": 750, "modifiers": [{"group_name": "Choix de viande", "modifier_name": "Poulet", "price_extra": 0}, {"group_name": "Sauce", "modifier_name": "Samourai", "price_extra": 0}], "line_total": 1500},
    {"product_id": "d0000014-0000-0000-0000-000000000000", "product_name": "Coca-Cola 33cl", "quantity": 2, "unit_price": 200, "modifiers": [], "line_total": 400}
  ]',
  'new', 1900, 'on_site', 'dine_in', false, 'CPT-001',
  now() - interval '18 minutes'
);

-- #2 — Comptoir: A encaisser (new, on_site, unpaid, takeaway)
INSERT INTO public.orders (
  id, restaurant_id, customer_info, items, status, total_price,
  payment_method, order_type, paid, display_order_number, created_at
) VALUES (
  'aaaa0002-0000-0000-0000-000000000000',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '{"name": "Sophie M.", "notes": "Sans oignons svp"}',
  '[
    {"product_id": "d0000005-0000-0000-0000-000000000000", "product_name": "Kebab Classique", "quantity": 1, "unit_price": 700, "modifiers": [{"group_name": "Sauce", "modifier_name": "Blanche", "price_extra": 0}, {"group_name": "Retirer", "modifier_name": "Sans oignons", "price_extra": 0}], "line_total": 700},
    {"product_id": "d0000011-0000-0000-0000-000000000000", "product_name": "Frites", "quantity": 1, "unit_price": 300, "modifiers": [], "line_total": 300}
  ]',
  'new', 1000, 'on_site', 'takeaway', false, 'CPT-002',
  now() - interval '12 minutes'
);

-- #3 — Comptoir: Nouvelle (new, online, paid)
INSERT INTO public.orders (
  id, restaurant_id, customer_info, items, status, total_price,
  payment_method, order_type, paid, display_order_number, created_at
) VALUES (
  'aaaa0003-0000-0000-0000-000000000000',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '{"name": "Youssef K.", "phone": "+33 6 98 76 54 32"}',
  '[
    {"product_id": "d0000004-0000-0000-0000-000000000000", "product_name": "Tacos Geant", "quantity": 1, "unit_price": 1150, "modifiers": [{"group_name": "Sauce", "modifier_name": "Algerienne", "price_extra": 0}, {"group_name": "Supplements", "modifier_name": "Double fromage", "price_extra": 150}, {"group_name": "Supplements", "modifier_name": "Jalapenos", "price_extra": 100}], "line_total": 1400},
    {"product_id": "d0000017-0000-0000-0000-000000000000", "product_name": "Ayran", "quantity": 1, "unit_price": 200, "modifiers": [], "line_total": 200}
  ]',
  'new', 1600, 'online', 'takeaway', true, 'CB-001',
  now() - interval '8 minutes'
);

-- #4 — Comptoir: Nouvelle (new, online, paid, dine_in)
INSERT INTO public.orders (
  id, restaurant_id, customer_info, items, status, total_price,
  payment_method, order_type, paid, display_order_number, created_at
) VALUES (
  'aaaa0004-0000-0000-0000-000000000000',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '{"name": "Amelie D."}',
  '[
    {"product_id": "d0000009-0000-0000-0000-000000000000", "product_name": "Double Cheese", "quantity": 1, "unit_price": 900, "modifiers": [{"group_name": "Supplements", "modifier_name": "Bacon", "price_extra": 150}, {"group_name": "Supplements", "modifier_name": "Oeuf au plat", "price_extra": 100}], "line_total": 1150},
    {"product_id": "d0000012-0000-0000-0000-000000000000", "product_name": "Frites Cheddar", "quantity": 1, "unit_price": 450, "modifiers": [], "line_total": 450},
    {"product_id": "d0000015-0000-0000-0000-000000000000", "product_name": "Orangina 33cl", "quantity": 1, "unit_price": 200, "modifiers": [], "line_total": 200}
  ]',
  'new', 1800, 'online', 'dine_in', true, 'CB-002',
  now() - interval '5 minutes'
);

-- #5 — Comptoir: En preparation (preparing, paid)
INSERT INTO public.orders (
  id, restaurant_id, customer_info, items, status, total_price,
  payment_method, order_type, paid, display_order_number, created_at
) VALUES (
  'aaaa0005-0000-0000-0000-000000000000',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '{"name": "Thomas R.", "phone": "+33 7 11 22 33 44"}',
  '[
    {"product_id": "d0000002-0000-0000-0000-000000000000", "product_name": "Tacos 2 Viandes", "quantity": 1, "unit_price": 850, "modifiers": [{"group_name": "Choix de viandes (2)", "modifier_name": "Poulet", "price_extra": 0}, {"group_name": "Choix de viandes (2)", "modifier_name": "Merguez", "price_extra": 0}, {"group_name": "Sauce", "modifier_name": "Biggy Burger", "price_extra": 0}, {"group_name": "Supplements", "modifier_name": "Cheddar fondu", "price_extra": 150}], "line_total": 1000},
    {"product_id": "d0000013-0000-0000-0000-000000000000", "product_name": "Nuggets x6", "quantity": 1, "unit_price": 400, "modifiers": [], "line_total": 400}
  ]',
  'preparing', 1400, 'online', 'takeaway', true, 'CB-003',
  now() - interval '22 minutes'
);

-- #6 — Comptoir: En preparation (preparing, on_site, paid)
INSERT INTO public.orders (
  id, restaurant_id, customer_info, items, status, total_price,
  payment_method, order_type, paid, display_order_number, created_at
) VALUES (
  'aaaa0006-0000-0000-0000-000000000000',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '{"name": "Leila A.", "notes": "Bien cuit svp"}',
  '[
    {"product_id": "d0000006-0000-0000-0000-000000000000", "product_name": "Kebab Assiette", "quantity": 1, "unit_price": 950, "modifiers": [{"group_name": "Sauce", "modifier_name": "Harissa", "price_extra": 0}], "line_total": 950},
    {"product_id": "d0000018-0000-0000-0000-000000000000", "product_name": "Ice Tea 33cl", "quantity": 1, "unit_price": 200, "modifiers": [], "line_total": 200}
  ]',
  'preparing', 1150, 'on_site', 'dine_in', true, 'CPT-003',
  now() - interval '25 minutes'
);

-- #7 — Comptoir: Prete (ready, paid)
INSERT INTO public.orders (
  id, restaurant_id, customer_info, items, status, total_price,
  payment_method, order_type, paid, display_order_number, created_at
) VALUES (
  'aaaa0007-0000-0000-0000-000000000000',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '{"name": "Mehdi H.", "phone": "+33 6 55 44 33 22"}',
  '[
    {"product_id": "d0000003-0000-0000-0000-000000000000", "product_name": "Tacos 3 Viandes", "quantity": 1, "unit_price": 950, "modifiers": [{"group_name": "Choix de viandes (3)", "modifier_name": "Poulet", "price_extra": 0}, {"group_name": "Choix de viandes (3)", "modifier_name": "Tenders", "price_extra": 0}, {"group_name": "Choix de viandes (3)", "modifier_name": "Cordon bleu", "price_extra": 0}, {"group_name": "Sauce", "modifier_name": "Barbecue", "price_extra": 0}], "line_total": 950},
    {"product_id": "d0000016-0000-0000-0000-000000000000", "product_name": "Eau Minerale 50cl", "quantity": 1, "unit_price": 150, "modifiers": [], "line_total": 150}
  ]',
  'ready', 1100, 'online', 'takeaway', true, 'CB-004',
  now() - interval '35 minutes'
);

-- #8 — Comptoir: Prete (ready, on_site, paid)
INSERT INTO public.orders (
  id, restaurant_id, customer_info, items, status, total_price,
  payment_method, order_type, paid, display_order_number, created_at
) VALUES (
  'aaaa0008-0000-0000-0000-000000000000',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '{"name": "Hugo P."}',
  '[
    {"product_id": "d0000010-0000-0000-0000-000000000000", "product_name": "Burger Chicken", "quantity": 2, "unit_price": 800, "modifiers": [], "line_total": 1600},
    {"product_id": "d0000011-0000-0000-0000-000000000000", "product_name": "Frites", "quantity": 2, "unit_price": 300, "modifiers": [], "line_total": 600},
    {"product_id": "d0000014-0000-0000-0000-000000000000", "product_name": "Coca-Cola 33cl", "quantity": 2, "unit_price": 200, "modifiers": [], "line_total": 400},
    {"product_id": "d0000019-0000-0000-0000-000000000000", "product_name": "Tiramisu", "quantity": 2, "unit_price": 350, "modifiers": [], "line_total": 700}
  ]',
  'ready', 3300, 'on_site', 'dine_in', true, 'CPT-004',
  now() - interval '40 minutes'
);

-- #9 — Grosse commande en preparation (preparing, paid, takeaway)
INSERT INTO public.orders (
  id, restaurant_id, customer_info, items, status, total_price,
  payment_method, order_type, paid, display_order_number, created_at
) VALUES (
  'aaaa0009-0000-0000-0000-000000000000',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '{"name": "Fatima Z.", "phone": "+33 6 77 88 99 00", "notes": "Commande pour 4 personnes"}',
  '[
    {"product_id": "d0000001-0000-0000-0000-000000000000", "product_name": "Tacos 1 Viande", "quantity": 1, "unit_price": 750, "modifiers": [{"group_name": "Choix de viande", "modifier_name": "Tenders", "price_extra": 0}, {"group_name": "Sauce", "modifier_name": "Andalouse", "price_extra": 0}], "line_total": 750},
    {"product_id": "d0000005-0000-0000-0000-000000000000", "product_name": "Kebab Classique", "quantity": 2, "unit_price": 700, "modifiers": [{"group_name": "Sauce", "modifier_name": "Algerienne", "price_extra": 0}], "line_total": 1400},
    {"product_id": "d0000008-0000-0000-0000-000000000000", "product_name": "Cheese Burger", "quantity": 1, "unit_price": 650, "modifiers": [{"group_name": "Supplements", "modifier_name": "Bacon", "price_extra": 150}], "line_total": 800},
    {"product_id": "d0000012-0000-0000-0000-000000000000", "product_name": "Frites Cheddar", "quantity": 2, "unit_price": 450, "modifiers": [], "line_total": 900},
    {"product_id": "d0000014-0000-0000-0000-000000000000", "product_name": "Coca-Cola 33cl", "quantity": 4, "unit_price": 200, "modifiers": [], "line_total": 800}
  ]',
  'preparing', 4650, 'online', 'takeaway', true, 'CB-005',
  now() - interval '15 minutes'
);

-- #10 — Nouvelle commande tout juste passee (new, on_site, unpaid)
INSERT INTO public.orders (
  id, restaurant_id, customer_info, items, status, total_price,
  payment_method, order_type, paid, display_order_number, created_at
) VALUES (
  'aaaa0010-0000-0000-0000-000000000000',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '{"name": "Ines L."}',
  '[
    {"product_id": "d0000007-0000-0000-0000-000000000000", "product_name": "Durum", "quantity": 1, "unit_price": 750, "modifiers": [{"group_name": "Sauce", "modifier_name": "Samourai", "price_extra": 0}, {"group_name": "Retirer", "modifier_name": "Sans tomates", "price_extra": 0}], "line_total": 750},
    {"product_id": "d0000020-0000-0000-0000-000000000000", "product_name": "Baklava x3", "quantity": 1, "unit_price": 300, "modifiers": [], "line_total": 300},
    {"product_id": "d0000017-0000-0000-0000-000000000000", "product_name": "Ayran", "quantity": 1, "unit_price": 200, "modifiers": [], "line_total": 200}
  ]',
  'new', 1250, 'on_site', 'dine_in', false, 'CPT-005',
  now() - interval '2 minutes'
);
