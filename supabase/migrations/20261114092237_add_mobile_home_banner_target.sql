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
