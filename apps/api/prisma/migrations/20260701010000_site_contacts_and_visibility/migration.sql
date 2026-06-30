-- Enable pgcrypto if needed; ignore error if already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Add map/location + visibility fields to SiteSettings.
-- Defaults match what was previously hardcoded in code/seed.

-- Drop the seeded address literal so new column shortAddress can take over the
-- public-facing string (the legacy `address` field is kept for compat).
ALTER TABLE "SiteSettings"
  ADD COLUMN IF NOT EXISTS "mapProvider" TEXT NOT NULL DEFAULT 'yandex',
  ADD COLUMN IF NOT EXISTS "shortAddress" TEXT NOT NULL DEFAULT 'г. Липецк, ул. Пушкина, 4',
  ADD COLUMN IF NOT EXISTS "mapIframeUrl" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "mapMarkerLat" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "mapMarkerLng" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "mapZoom" INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS "mapCustomMarkerUrl" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "mapRouteStartHint" TEXT NOT NULL DEFAULT 'Ваш адрес или точка на карте',

  ADD COLUMN IF NOT EXISTS "servicesPageEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "mastersPageEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "galleryPageEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "promotionsPageEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "reviewsPageEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "vacanciesPageEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "faqPageEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "contactsPageEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "homeServicesSectionEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "homeMastersSectionEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "servicesInNavEnabled" BOOLEAN NOT NULL DEFAULT TRUE;

-- Set sensible default coords for a Lipetsk salon landmark
-- (ул. Пушкина 4 ≈ 52.608672, 39.598543 from yandex maps)
UPDATE "SiteSettings"
SET "mapMarkerLat" = 52.608672,
    "mapMarkerLng" = 39.598543
WHERE "mapMarkerLat" IS NULL;
