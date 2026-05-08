-- Add public contact email and social links to restaurants so the customer-side
-- "fiche d'identité" modal can display them. social_links is a free-form JSON
-- object (keys: instagram, facebook, tiktok, website, twitter, ...).

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS social_links JSONB NOT NULL DEFAULT '{}'::jsonb;
