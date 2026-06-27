CREATE TABLE "websites" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "domain" TEXT NOT NULL,
  "start_url" TEXT NOT NULL,
  "industry" TEXT,
  "target_country" TEXT NOT NULL DEFAULT 'Indonesia',
  "target_language" TEXT NOT NULL DEFAULT 'id',
  "crawl_status" TEXT NOT NULL DEFAULT 'pending',
  "current_crawl_job_id" TEXT,
  "last_crawled_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "websites_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crawl_jobs" (
  "id" TEXT NOT NULL,
  "website_id" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'dataforseo',
  "provider_task_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "max_crawl_pages" INTEGER NOT NULL DEFAULT 100,
  "started_at" TIMESTAMP(3),
  "finished_at" TIMESTAMP(3),
  "error_message" TEXT,
  "raw_request" JSONB,
  "raw_response" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "crawl_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crawl_pages" (
  "id" TEXT NOT NULL,
  "website_id" TEXT NOT NULL,
  "crawl_job_id" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "normalized_url" TEXT,
  "status_code" INTEGER,
  "title" TEXT,
  "meta_description" TEXT,
  "h1" TEXT,
  "word_count" INTEGER,
  "internal_links_count" INTEGER,
  "external_links_count" INTEGER,
  "images_count" INTEGER,
  "images_missing_alt_count" INTEGER,
  "is_indexable" BOOLEAN,
  "canonical_url" TEXT,
  "raw_metrics" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "crawl_pages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crawl_links" (
  "id" TEXT NOT NULL,
  "website_id" TEXT NOT NULL,
  "crawl_job_id" TEXT NOT NULL,
  "source_url" TEXT NOT NULL,
  "target_url" TEXT NOT NULL,
  "anchor_text" TEXT,
  "is_internal" BOOLEAN NOT NULL DEFAULT false,
  "is_external" BOOLEAN NOT NULL DEFAULT false,
  "is_broken" BOOLEAN NOT NULL DEFAULT false,
  "status_code" INTEGER,
  "link_type" TEXT,
  "raw_data" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "crawl_links_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crawl_summaries" (
  "id" TEXT NOT NULL,
  "website_id" TEXT NOT NULL,
  "crawl_job_id" TEXT NOT NULL,
  "total_pages" INTEGER NOT NULL DEFAULT 0,
  "crawled_pages" INTEGER NOT NULL DEFAULT 0,
  "broken_links_count" INTEGER NOT NULL DEFAULT 0,
  "redirects_count" INTEGER NOT NULL DEFAULT 0,
  "missing_title_count" INTEGER NOT NULL DEFAULT 0,
  "missing_meta_description_count" INTEGER NOT NULL DEFAULT 0,
  "missing_h1_count" INTEGER NOT NULL DEFAULT 0,
  "missing_alt_text_count" INTEGER NOT NULL DEFAULT 0,
  "raw_summary" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "crawl_summaries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "websites_tenant_id_domain_key" ON "websites"("tenant_id", "domain");
CREATE INDEX "websites_tenant_id_idx" ON "websites"("tenant_id");
CREATE INDEX "websites_user_id_idx" ON "websites"("user_id");
CREATE INDEX "websites_crawl_status_idx" ON "websites"("crawl_status");
CREATE INDEX "crawl_jobs_website_id_idx" ON "crawl_jobs"("website_id");
CREATE INDEX "crawl_jobs_provider_task_id_idx" ON "crawl_jobs"("provider_task_id");
CREATE INDEX "crawl_jobs_status_idx" ON "crawl_jobs"("status");
CREATE UNIQUE INDEX "crawl_pages_crawl_job_id_url_key" ON "crawl_pages"("crawl_job_id", "url");
CREATE INDEX "crawl_pages_website_id_idx" ON "crawl_pages"("website_id");
CREATE INDEX "crawl_pages_crawl_job_id_idx" ON "crawl_pages"("crawl_job_id");
CREATE INDEX "crawl_links_website_id_idx" ON "crawl_links"("website_id");
CREATE INDEX "crawl_links_crawl_job_id_idx" ON "crawl_links"("crawl_job_id");
CREATE INDEX "crawl_links_is_broken_idx" ON "crawl_links"("is_broken");
CREATE UNIQUE INDEX "crawl_summaries_crawl_job_id_key" ON "crawl_summaries"("crawl_job_id");
CREATE INDEX "crawl_summaries_website_id_idx" ON "crawl_summaries"("website_id");

ALTER TABLE "websites" ADD CONSTRAINT "websites_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "websites" ADD CONSTRAINT "websites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crawl_jobs" ADD CONSTRAINT "crawl_jobs_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crawl_pages" ADD CONSTRAINT "crawl_pages_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crawl_pages" ADD CONSTRAINT "crawl_pages_crawl_job_id_fkey" FOREIGN KEY ("crawl_job_id") REFERENCES "crawl_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crawl_links" ADD CONSTRAINT "crawl_links_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crawl_links" ADD CONSTRAINT "crawl_links_crawl_job_id_fkey" FOREIGN KEY ("crawl_job_id") REFERENCES "crawl_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crawl_summaries" ADD CONSTRAINT "crawl_summaries_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crawl_summaries" ADD CONSTRAINT "crawl_summaries_crawl_job_id_fkey" FOREIGN KEY ("crawl_job_id") REFERENCES "crawl_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
