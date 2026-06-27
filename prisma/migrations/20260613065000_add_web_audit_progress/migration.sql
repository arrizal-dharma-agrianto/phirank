ALTER TABLE "public"."web_audits"
ADD COLUMN "progress" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN "current_step" TEXT;
