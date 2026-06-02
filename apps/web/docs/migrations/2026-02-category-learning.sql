-- ============================================================
-- Shared category learning (idempotent)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.shopping_category_corrections (
  normalized_name text PRIMARY KEY,
  categoria text NOT NULL,
  sample_name text NULL,
  updated_by_nome text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_category_corrections_categoria
  ON public.shopping_category_corrections (categoria);

CREATE INDEX IF NOT EXISTS idx_category_corrections_updated_at
  ON public.shopping_category_corrections (updated_at DESC);

ALTER TABLE IF EXISTS public.shopping_category_corrections ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'shopping_category_corrections'
      AND policyname = 'category_corrections_select_all'
  ) THEN
    CREATE POLICY category_corrections_select_all
      ON public.shopping_category_corrections
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
      AND tablename = 'shopping_category_corrections'
      AND policyname = 'category_corrections_insert_all'
  ) THEN
    CREATE POLICY category_corrections_insert_all
      ON public.shopping_category_corrections
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
      AND tablename = 'shopping_category_corrections'
      AND policyname = 'category_corrections_update_all'
  ) THEN
    CREATE POLICY category_corrections_update_all
      ON public.shopping_category_corrections
      FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

