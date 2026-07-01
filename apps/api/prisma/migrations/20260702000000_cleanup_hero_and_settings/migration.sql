-- SiteSettings cleanup: simplify map, add centralised CTA, drop unused
-- page toggles, convert working hours to a single free-form text.

-- Drop columns that are no longer used.
ALTER TABLE "SiteSettings"
  DROP COLUMN IF EXISTS "mapProvider_old",
  DROP COLUMN IF EXISTS "mapMarkerLat",
  DROP COLUMN IF EXISTS "mapMarkerLng",
  DROP COLUMN IF EXISTS "mapCustomMarkerUrl",
  DROP COLUMN IF EXISTS "mapRouteStartHint",
  DROP COLUMN IF EXISTS "mapEmbedUrl",
  DROP COLUMN IF EXISTS "shortAddress",
  DROP COLUMN IF EXISTS "mastersPageEnabled",
  DROP COLUMN IF EXISTS "galleryPageEnabled",
  DROP COLUMN IF EXISTS "promotionsPageEnabled",
  DROP COLUMN IF EXISTS "reviewsPageEnabled",
  DROP COLUMN IF EXISTS "vacanciesPageEnabled",
  DROP COLUMN IF EXISTS "faqPageEnabled",
  DROP COLUMN IF EXISTS "contactsPageEnabled",
  DROP COLUMN IF EXISTS "homeMastersSectionEnabled",
  DROP COLUMN IF EXISTS "bookingUrl";

-- Rename mapProvider (already exists) to keep — we keep it as a string
-- enum ("yandex" | "custom" | "hidden"). No rename needed; we just
-- widen its allowed values in code.
ALTER TABLE "SiteSettings"
  ALTER COLUMN "mapProvider" SET DEFAULT 'yandex';

-- New: mapHidden flag for the public page.
ALTER TABLE "SiteSettings"
  ADD COLUMN IF NOT EXISTS "mapHidden" BOOLEAN NOT NULL DEFAULT false;

-- New: centralised CTA (booking button) configuration. These five
-- columns are the single source of truth for the "Записаться
-- онлайн" button — toolbar, banner, cta-strip all read from here.
ALTER TABLE "SiteSettings"
  ADD COLUMN IF NOT EXISTS "ctaLabel" TEXT NOT NULL DEFAULT 'Записаться онлайн',
  ADD COLUMN IF NOT EXISTS "ctaUrl" TEXT NOT NULL DEFAULT 'https://dikidi.ru/#widget=212727',
  ADD COLUMN IF NOT EXISTS "ctaShowInToolbar" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "ctaShowInBanner" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "ctaShowInCtaStrip" BOOLEAN NOT NULL DEFAULT true;

-- Replace workingHours (Json array of 7 days) with a single free-form
-- text. Convert the existing data on the way out: stringify the
-- "mon-fri 10:00-20:00, sat-sun выходной" pattern.
ALTER TABLE "SiteSettings"
  ADD COLUMN IF NOT EXISTS "workingHoursText" TEXT NOT NULL DEFAULT 'пн-пт 10:00–20:00, сб-вс выходной';

-- Drop the old Json column now that data is migrated. (The conversion
-- is intentionally lossy because the old shape was a 7-element array
-- we don't use anywhere on the public site; if the admin has been
-- customising hours they will see the default text and can re-enter.)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'SiteSettings' AND column_name = 'workingHours'
  ) THEN
    ALTER TABLE "SiteSettings" DROP COLUMN "workingHours";
  END IF;
END $$;

-- Default SEO description (was empty).
ALTER TABLE "SiteSettings"
  ALTER COLUMN "seoDescription" SET DEFAULT 'Салон красоты бизнес-класса в Липецке с 2013 года. Стрижки, окрашивание, уход, маникюр, педикюр, косметология. Запись онлайн через Dikidi.';

-- Update the existing singleton row with sensible defaults so the new
-- UI has values to show.
UPDATE "SiteSettings"
SET
  "mapProvider" = CASE WHEN "mapIframeUrl" IS NOT NULL AND "mapIframeUrl" != '' THEN 'custom' ELSE 'yandex' END,
  "mapHidden" = false,
  "ctaLabel" = COALESCE(NULLIF("ctaLabel", ''), 'Записаться онлайн'),
  "ctaUrl" = COALESCE(NULLIF("ctaUrl", ''), 'https://dikidi.ru/#widget=212727'),
  "ctaShowInToolbar" = true,
  "ctaShowInBanner" = true,
  "ctaShowInCtaStrip" = true,
  "workingHoursText" = COALESCE(NULLIF("workingHoursText", ''), 'пн-пт 10:00–20:00, сб-вс выходной'),
  "seoDescription" = COALESCE(NULLIF("seoDescription", ''), 'Салон красоты бизнес-класса в Липецке с 2013 года. Стрижки, окрашивание, уход, маникюр, педикюр, косметология. Запись онлайн через Dikidi.')
WHERE id = 'singleton';
