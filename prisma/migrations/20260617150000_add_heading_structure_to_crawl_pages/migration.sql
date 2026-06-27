ALTER TABLE "crawl_pages"
  ADD COLUMN IF NOT EXISTS "heading_structure" JSONB NOT NULL DEFAULT '[]'::jsonb;
