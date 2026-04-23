-- ============================================
-- 016 - SECURITY HARDENING (RLS + storage)
-- ============================================
-- Ferme les failles de l'audit de securite:
--   C2: RLS ouverte sur orders -> restreint a owner/customer/driver
--   C3: bucket verification-documents public -> passe en prive
--   M5: queue_tickets lisible publiquement -> restreint a l'owner

-- ============================================
-- C2: ORDERS - Restrict public access
-- ============================================
DROP POLICY IF EXISTS "Public: insert orders" ON public.orders;
DROP POLICY IF EXISTS "Public: read orders" ON public.orders;
DROP POLICY IF EXISTS "Owner: read own restaurant orders" ON public.orders;
DROP POLICY IF EXISTS "Customer: read own orders" ON public.orders;
DROP POLICY IF EXISTS "Driver: read delivery orders" ON public.orders;

-- Owner du restaurant peut lire toutes ses commandes
CREATE POLICY "Owner: read own restaurant orders" ON public.orders FOR SELECT
  USING (restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
  ));

-- Customer connecte peut lire ses propres commandes
CREATE POLICY "Customer: read own orders" ON public.orders FOR SELECT
  USING (customer_user_id = auth.uid());

-- Driver assigne peut lire les commandes livraison de son restaurant
-- (conditionnel: requiert la table drivers creee en migration 015)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'drivers'
  ) THEN
    EXECUTE $ddl$
      CREATE POLICY "Driver: read delivery orders" ON public.orders FOR SELECT
        USING (
          order_type = 'delivery'
          AND restaurant_id IN (
            SELECT restaurant_id FROM public.drivers
            WHERE user_id = auth.uid() AND is_active = true
          )
        )
    $ddl$;
  END IF;
END $$;

-- Les inserts ne passent plus que par la route /api/checkout (service-role)

-- ============================================
-- M5: QUEUE_TICKETS - Restrict public read
-- ============================================
-- (conditionnel: requiert la table queue_tickets creee en migration 012)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'queue_tickets'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can view queue tickets" ON public.queue_tickets';
    EXECUTE 'DROP POLICY IF EXISTS "Owner: read queue tickets" ON public.queue_tickets';
    EXECUTE 'DROP POLICY IF EXISTS "Customer: read own queue tickets" ON public.queue_tickets';

    EXECUTE $ddl$
      CREATE POLICY "Owner: read queue tickets" ON public.queue_tickets FOR SELECT
        USING (restaurant_id IN (
          SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
        ))
    $ddl$;

    EXECUTE $ddl$
      CREATE POLICY "Customer: read own queue tickets" ON public.queue_tickets FOR SELECT
        USING (customer_user_id = auth.uid())
    $ddl$;
  END IF;
END $$;

-- Pour les clients anonymes, le suivi de la file se fait via /api/queue
-- (service-role) qui filtre par customer_session_id transmis dans l'URL.

-- ============================================
-- C3: VERIFICATION-DOCUMENTS - Make private
-- ============================================
-- Passe le bucket en prive (les objets existants ne seront plus accessibles via URL publique)
UPDATE storage.buckets
  SET public = false
  WHERE id = 'verification-documents';

-- Retire la policy de lecture publique
DROP POLICY IF EXISTS "Public read verification documents" ON storage.objects;

-- Seul le service-role (routes /api/super-admin et /api/admin/onboarding) peut lire.
-- Les super-admins lisent via createSignedUrl cote serveur.

-- ============================================
-- H1: Block SVG uploads on restaurant-logos bucket
-- ============================================
-- SVG peut contenir des scripts -> XSS stocke. On whiteliste les images safe.
UPDATE storage.buckets
  SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'],
      file_size_limit = 2 * 1024 * 1024
  WHERE id = 'restaurant-logos';

-- M2: Enforce MIME/size limits at bucket level for verification documents
UPDATE storage.buckets
  SET allowed_mime_types = ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ],
      file_size_limit = 10 * 1024 * 1024
  WHERE id = 'verification-documents';

-- ============================================
-- Comment: inserts d'orders doivent passer par service-role
-- ============================================
COMMENT ON TABLE public.orders IS
  'Inserts only via service-role (checkout API). RLS denies anon inserts after migration 016.';
