-- Replace the partially-guessable readable slug with an unguessable
-- 22-char base64url identifier (~128 bits of entropy) used in URLs.
-- The legacy `slug` column is kept so old QR codes / shared links keep
-- working via a server-side fallback redirect.

CREATE OR REPLACE FUNCTION public.generate_public_id() RETURNS TEXT AS $$
  SELECT translate(rtrim(encode(gen_random_bytes(16), 'base64'), '='), '+/', '-_');
$$ LANGUAGE SQL VOLATILE;

ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS public_id TEXT;

UPDATE public.restaurants
  SET public_id = public.generate_public_id()
  WHERE public_id IS NULL;

ALTER TABLE public.restaurants
  ALTER COLUMN public_id SET NOT NULL,
  ALTER COLUMN public_id SET DEFAULT public.generate_public_id();

ALTER TABLE public.restaurants
  ADD CONSTRAINT restaurants_public_id_unique UNIQUE (public_id);

CREATE INDEX IF NOT EXISTS idx_restaurants_public_id
  ON public.restaurants(public_id);
