ALTER TABLE "crawl_jobs" ADD COLUMN "elapsed_time_ms" INTEGER;

UPDATE "crawl_jobs"
SET "elapsed_time_ms" = GREATEST(
  0,
  FLOOR(EXTRACT(EPOCH FROM ("finished_at" - COALESCE("started_at", "created_at"))) * 1000)::integer
)
WHERE "finished_at" IS NOT NULL
  AND "elapsed_time_ms" IS NULL;
