CREATE TABLE "public"."content_generator_indexnow" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "key_location" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "last_verified_at" TIMESTAMP(3),
  "last_submitted_url" TEXT,
  "last_error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "content_generator_indexnow_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "content_generator_indexnow_tenant_id_key"
ON "public"."content_generator_indexnow"("tenant_id");

CREATE INDEX "content_generator_indexnow_status_idx"
ON "public"."content_generator_indexnow"("status");

ALTER TABLE "public"."content_generator_indexnow"
ADD CONSTRAINT "content_generator_indexnow_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
