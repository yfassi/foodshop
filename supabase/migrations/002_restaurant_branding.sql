-- Add branding columns to restaurants
ALTER TABLE public.restaurants
  ADD COLUMN primary_color TEXT,
  ADD COLUMN font_family TEXT;
