CREATE TYPE "public"."WebAuditStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');

CREATE TABLE "public"."web_audits" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" "public"."WebAuditStatus" NOT NULL DEFAULT 'COMPLETED',
    "overall_score" INTEGER NOT NULL,
    "categories" JSONB NOT NULL,
    "findings" JSONB NOT NULL,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "web_audits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "web_audits_tenant_id_idx" ON "public"."web_audits"("tenant_id");
CREATE INDEX "web_audits_user_id_idx" ON "public"."web_audits"("user_id");
CREATE INDEX "web_audits_status_idx" ON "public"."web_audits"("status");
CREATE INDEX "web_audits_created_at_idx" ON "public"."web_audits"("created_at");

ALTER TABLE "public"."web_audits"
ADD CONSTRAINT "web_audits_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."web_audits"
ADD CONSTRAINT "web_audits_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
