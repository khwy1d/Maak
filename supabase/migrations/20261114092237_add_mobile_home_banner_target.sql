-- Bootstrap the home banner table for clean Supabase installations.
-- The production project already had this table, but its original DDL was not
-- tracked in the repository migrations. Keep this migration self-contained.
CREATE TABLE IF NOT EXISTS public.home_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path text NOT NULL,
  alt_text text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.home_banners ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.home_banners TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.home_banners TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='home_banners' AND policyname='Public read active home banners') THEN
    CREATE POLICY "Public read active home banners" ON public.home_banners
      FOR SELECT TO anon, authenticated USING (is_active = true OR public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='home_banners' AND policyname='Admins manage home banners') THEN
    CREATE POLICY "Admins manage home banners" ON public.home_banners
      FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
END $$;

-- The bucket is public for image display; uploads and mutations remain admin-only.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('home-banners', 'home-banners', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Admins upload home banners') THEN
    CREATE POLICY "Admins upload home banners" ON storage.objects
      FOR INSERT TO authenticated WITH CHECK (bucket_id = 'home-banners' AND public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Admins update home banners') THEN
    CREATE POLICY "Admins update home banners" ON storage.objects
      FOR UPDATE TO authenticated USING (bucket_id = 'home-banners' AND public.is_admin())
      WITH CHECK (bucket_id = 'home-banners' AND public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Admins delete home banners') THEN
    CREATE POLICY "Admins delete home banners" ON storage.objects
      FOR DELETE TO authenticated USING (bucket_id = 'home-banners' AND public.is_admin());
  END IF;
END $$;

-- Separate the phone-only home banner from the desktop homepage carousel.
ALTER TABLE public.home_banners
  ADD COLUMN IF NOT EXISTS display_target text NOT NULL DEFAULT 'all';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'home_banners_display_target_check'
      AND conrelid = 'public.home_banners'::regclass
  ) THEN
    ALTER TABLE public.home_banners
      ADD CONSTRAINT home_banners_display_target_check
      CHECK (display_target IN ('all', 'mobile'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS home_banners_active_target_order_idx
  ON public.home_banners (display_target, is_active, sort_order);
