-- ============================================
-- 017 - DROP UNUSED TABLES
-- ============================================
-- Nettoyage: tables heritees d'une ancienne app (collecte de documents)
-- qui ne sont jamais referencees par foodshop. On CASCADE pour gerer
-- les FK entre elles sans toucher aux tables foodshop.

DROP TABLE IF EXISTS public.ai_credits CASCADE;
DROP TABLE IF EXISTS public.batch_operations CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.collecte_documents CASCADE;
DROP TABLE IF EXISTS public.collecte_participants CASCADE;
DROP TABLE IF EXISTS public.collecte_recipients CASCADE;
DROP TABLE IF EXISTS public.collectes CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;
DROP TABLE IF EXISTS public.folders CASCADE;
DROP TABLE IF EXISTS public.participant_documents CASCADE;
DROP TABLE IF EXISTS public.participant_files CASCADE;
DROP TABLE IF EXISTS public.reminder_logs CASCADE;
DROP TABLE IF EXISTS public.scoring_results CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.template_items CASCADE;
DROP TABLE IF EXISTS public.templates CASCADE;
DROP TABLE IF EXISTS public.uploaded_files CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
