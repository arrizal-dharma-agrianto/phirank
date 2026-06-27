CREATE TABLE "public"."content_generator_drafts" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "model" TEXT,
  "source" JSONB NOT NULL,
  "status" TEXT NOT NULL,
  "publish_delivery_id" TEXT,
  "publish_status_code" INTEGER,
  "publish_error" TEXT,
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "content_generator_drafts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "content_generator_drafts_tenant_id_created_at_idx"
ON "public"."content_generator_drafts"("tenant_id", "created_at");

CREATE INDEX "content_generator_drafts_tenant_id_status_idx"
ON "public"."content_generator_drafts"("tenant_id", "status");

ALTER TABLE "public"."content_generator_drafts"
ADD CONSTRAINT "content_generator_drafts_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
