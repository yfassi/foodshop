-- Add restaurant type and SIRET number
ALTER TABLE public.restaurants ADD COLUMN restaurant_type TEXT;
ALTER TABLE public.restaurants ADD COLUMN siret TEXT;
