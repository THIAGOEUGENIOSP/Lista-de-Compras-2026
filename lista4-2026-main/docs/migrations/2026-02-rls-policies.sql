-- ============================================================
-- RLS policies (idempotent) for public collaborative app
-- ============================================================

-- Enable RLS
ALTER TABLE IF EXISTS public.periodos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_log ENABLE ROW LEVEL SECURITY;

-- periodos policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'periodos'
      AND policyname = 'periodos_select_all'
  ) THEN
    CREATE POLICY periodos_select_all
      ON public.periodos
      FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'periodos'
      AND policyname = 'periodos_insert_all'
  ) THEN
    CREATE POLICY periodos_insert_all
      ON public.periodos
      FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- items policies (needed for app CRUD)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'items'
      AND policyname = 'items_select_all'
  ) THEN
    CREATE POLICY items_select_all
      ON public.items
      FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'items'
      AND policyname = 'items_insert_all'
  ) THEN
    CREATE POLICY items_insert_all
      ON public.items
      FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'items'
      AND policyname = 'items_update_all'
  ) THEN
    CREATE POLICY items_update_all
      ON public.items
      FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'items'
      AND policyname = 'items_delete_all'
  ) THEN
    CREATE POLICY items_delete_all
      ON public.items
      FOR DELETE
      USING (true);
  END IF;
END $$;

-- audit_log policies (insert/read for debugging)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'audit_log'
      AND policyname = 'audit_log_select_all'
  ) THEN
    CREATE POLICY audit_log_select_all
      ON public.audit_log
      FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'audit_log'
      AND policyname = 'audit_log_insert_all'
  ) THEN
    CREATE POLICY audit_log_insert_all
      ON public.audit_log
      FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;
