-- Migration: Enable RLS on legacy public tables still present in Supabase
-- These tables are either legacy leftovers or created outside the numbered
-- migrations chain. We enable RLS and grant access only to backend roles.

DO $$
DECLARE
  target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'categories',
    'blog_post_services',
    'services',
    'supabase_keepalive'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename = target_table
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
        target_table
      );

      IF EXISTS (
        SELECT 1
        FROM pg_roles
        WHERE rolname = 'postgres'
      ) AND NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = target_table
          AND policyname = format('backend_postgres_%s', target_table)
      ) THEN
        EXECUTE format(
          'CREATE POLICY %I ON public.%I FOR ALL TO postgres USING (true) WITH CHECK (true)',
          format('backend_postgres_%s', target_table),
          target_table
        );
      END IF;

      IF EXISTS (
        SELECT 1
        FROM pg_roles
        WHERE rolname = 'service_role'
      ) AND NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = target_table
          AND policyname = format('backend_service_role_%s', target_table)
      ) THEN
        EXECUTE format(
          'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
          format('backend_service_role_%s', target_table),
          target_table
        );
      END IF;
    END IF;
  END LOOP;
END
$$;
