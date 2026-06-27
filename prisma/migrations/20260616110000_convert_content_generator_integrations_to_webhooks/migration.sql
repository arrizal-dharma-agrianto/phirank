DROP INDEX IF EXISTS "public"."content_generator_integrations_api_key_hash_key";
DROP INDEX IF EXISTS "public"."content_generator_integrations_tenant_id_allowed_origin_key";
DROP INDEX IF EXISTS "public"."content_generator_integrations_allowed_origin_idx";

ALTER TABLE "public"."content_generator_integrations"
RENAME COLUMN "allowed_origin" TO "webhook_url";

ALTER TABLE "public"."content_generator_integrations"
RENAME COLUMN "api_key_hash" TO "webhook_secret";

CREATE UNIQUE INDEX "content_generator_integrations_tenant_id_webhook_url_key"
ON "public"."content_generator_integrations"("tenant_id", "webhook_url");

CREATE INDEX "content_generator_integrations_webhook_url_idx"
ON "public"."content_generator_integrations"("webhook_url");
