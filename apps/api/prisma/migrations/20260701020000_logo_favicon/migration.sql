-- Logo + favicon upload fields.
ALTER TABLE "SiteSettings"
  ADD COLUMN IF NOT EXISTS "logoUrl" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "faviconUrl" TEXT NOT NULL DEFAULT '';