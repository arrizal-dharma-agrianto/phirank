ALTER TABLE "public"."content_generator_drafts"
ADD COLUMN "meta_title" TEXT,
ADD COLUMN "title_options" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "meta_description" TEXT,
ADD COLUMN "description_options" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "slug" TEXT,
ADD COLUMN "slug_options" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "strategy_summary" TEXT,
ADD COLUMN "main_content" TEXT,
ADD COLUMN "internal_links" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "image_alt_texts" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "faq" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "seo_notes" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "sections" JSONB NOT NULL DEFAULT '{}';
