-- ============================================
-- 019 - SUPER ADMIN RLS BYPASS
-- ============================================
-- Adds a super_admins allowlist + is_super_admin() helper, and an
-- additive permissive RLS policy on every public-table that lets a
-- super admin read/write everything (so the staff can act-as a
-- restaurateur from /super-admin to help them configure their account).
--
-- Existing owner-scoped policies are untouched: PostgreSQL ORs all
-- permissive policies, so non-super-admins keep the same access.
-- ============================================

-- ---- 1. Super admins allowlist ----
CREATE TABLE IF NOT EXISTS public.super_admins (
  email      TEXT PRIMARY KEY,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS on super_admins itself: only the SECURITY DEFINER function below
-- (and the service role) ever read this table. No policies => no rows
-- visible to authenticated users via PostgREST.
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

INSERT INTO public.super_admins (email, notes)
VALUES ('yassine.fassi@gmail.com', 'Founder')
ON CONFLICT (email) DO NOTHING;

-- ---- 2. is_super_admin() helper ----
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.super_admins
    WHERE lower(email) = lower(auth.jwt() ->> 'email')
  );
$$;

REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, service_role;

-- ---- 3. Permissive "super_admin_all" policy on every public table ----
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'restaurants',
    'categories',
    'products',
    'modifier_groups',
    'modifiers',
    'shared_modifier_groups',
    'shared_modifiers',
    'product_shared_groups',
    'menu_choice_groups',
    'menu_choice_items',
    'orders',
    'customer_profiles',
    'wallets',
    'wallet_transactions',
    'drivers',
    'queue_tickets',
    'push_subscriptions'
  ])
  LOOP
    -- Skip if the table doesn't exist (safety for cross-env consistency).
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = tbl AND c.relkind = 'r'
    ) THEN
      CONTINUE;
    END IF;

    EXECUTE format(
      'DROP POLICY IF EXISTS "super_admin_all" ON public.%I',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "super_admin_all" ON public.%I
         AS PERMISSIVE
         FOR ALL
         TO authenticated
         USING (public.is_super_admin())
         WITH CHECK (public.is_super_admin())',
      tbl
    );
  END LOOP;
END $$;

-- ---- 4. Storage objects: let super admin read/write any bucket ----
-- Useful for inspecting KBIS docs, fixing logos, etc.
DROP POLICY IF EXISTS "super_admin_storage_all" ON storage.objects;
CREATE POLICY "super_admin_storage_all" ON storage.objects
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());
