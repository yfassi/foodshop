-- Append a 6-char random suffix to existing restaurant slugs so URLs are
-- collision-proof (two restaurants can share a name) and unguessable.
-- Idempotent: skips slugs that already end in `-` followed by 6 hex chars.

UPDATE public.restaurants
SET slug = slug || '-' || substr(md5(id::text || random()::text), 1, 6)
WHERE slug !~ '-[a-f0-9]{6}$';
