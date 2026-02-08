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
