CREATE TABLE "backlink_profiles" (
  "id" TEXT NOT NULL,
  "website_id" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'dataforseo',
  "target" TEXT NOT NULL,
  "total_backlinks" INTEGER NOT NULL DEFAULT 0,
  "referring_domains" INTEGER NOT NULL DEFAULT 0,
  "referring_main_domains" INTEGER NOT NULL DEFAULT 0,
  "dofollow_backlinks" INTEGER NOT NULL DEFAULT 0,
  "nofollow_backlinks" INTEGER NOT NULL DEFAULT 0,
  "raw_response" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "backlink_profiles_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "backlink_profiles_website_id_idx"
ON "backlink_profiles"("website_id");

CREATE INDEX "backlink_profiles_created_at_idx"
ON "backlink_profiles"("created_at");

ALTER TABLE "backlink_profiles"
ADD CONSTRAINT "backlink_profiles_website_id_fkey"
FOREIGN KEY ("website_id")
REFERENCES "websites"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
