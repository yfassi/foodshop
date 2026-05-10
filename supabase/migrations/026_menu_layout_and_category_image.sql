-- Adds restaurant-level menu layout preference and per-category illustration.
--
-- menu_layout drives both the customer order page and the admin counter
-- picker:
--   'linear'        — the existing scroll-snap list grouped by category
--   'category_grid' — a tile grid landing page (image + title), drilling
--                     into a single category at a time
--
-- categories.image_url is the illustration used by the grid tiles. NULL
-- falls back to the existing emoji icon on a coloured background.

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS menu_layout TEXT NOT NULL DEFAULT 'linear';

ALTER TABLE public.restaurants
  DROP CONSTRAINT IF EXISTS restaurants_menu_layout_check;

ALTER TABLE public.restaurants
  ADD CONSTRAINT restaurants_menu_layout_check
  CHECK (menu_layout IN ('linear', 'category_grid'));

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS image_url TEXT;
