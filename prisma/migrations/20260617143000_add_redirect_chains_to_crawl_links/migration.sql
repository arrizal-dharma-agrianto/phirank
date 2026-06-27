ALTER TABLE "crawl_links" ADD COLUMN IF NOT EXISTS "final_url" TEXT;
ALTER TABLE "crawl_links" ADD COLUMN IF NOT EXISTS "redirect_chain" JSONB;
ALTER TABLE "crawl_links" ADD COLUMN IF NOT EXISTS "redirect_hop_count" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "crawl_links_redirect_hop_count_idx" ON "crawl_links"("redirect_hop_count");
