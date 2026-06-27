CREATE TABLE "public"."content_generator_integrations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "allowed_origin" TEXT NOT NULL,
    "api_key_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_generator_integrations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "content_generator_integrations_api_key_hash_key"
ON "public"."content_generator_integrations"("api_key_hash");

CREATE UNIQUE INDEX "content_generator_integrations_tenant_id_allowed_origin_key"
ON "public"."content_generator_integrations"("tenant_id", "allowed_origin");

CREATE INDEX "content_generator_integrations_tenant_id_idx"
ON "public"."content_generator_integrations"("tenant_id");

CREATE INDEX "content_generator_integrations_allowed_origin_idx"
ON "public"."content_generator_integrations"("allowed_origin");

ALTER TABLE "public"."content_generator_integrations"
ADD CONSTRAINT "content_generator_integrations_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
