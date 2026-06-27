import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { getAuthorizationContext } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import {
  getConfiguredWebsite,
  listCurrentCrawlPageInternalLinks,
} from "@/modules/data-audit-crawler/services/server/website.service";
import { contentGeneratorSchema } from "@/modules/content-generator/schemas";
import {
  generateGroqContent,
  GroqContentGenerationError,
  parseGeneratedContent,
} from "@/modules/content-generator/utils";

export const maxDuration = 60;

type DraftRow = {
  id: string;
  created_at: Date;
};

const formatInternalLinksForPrompt = (links: string[]) => {
  const lines: string[] = [];
  let totalLength = 0;

  for (const link of links) {
    const nextLength = totalLength + link.length + 1;

    if (nextLength > 1200) break;

    lines.push(link);
    totalLength = nextLength;
  }

  return lines.join("\n");
};

const POST = async (req: Request) =>
  withAuth(req, async ({ userId, body }) => {
    const authorization = await getAuthorizationContext(userId);

    if (!authorization) {
      return NextResponse.json(
        { message: "Tenant context not found" },
        { status: 403 },
      );
    }

    const configuredWebsite = await getConfiguredWebsite(
      authorization.tenantId,
    );

    if (!configuredWebsite) {
      return NextResponse.json(
        {
          message:
            "Configure a website in workspace settings before generating content.",
        },
        { status: 400 },
      );
    }

    const internalLinks = await listCurrentCrawlPageInternalLinks(
      authorization.tenantId,
    );
    const parsed = contentGeneratorSchema.safeParse({
      ...(body ?? {}),
      websiteUrl: configuredWebsite.startUrl,
      internalLinks: formatInternalLinksForPrompt(internalLinks),
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          message:
            parsed.error.issues[0]?.message ?? "Invalid content request.",
        },
        { status: 400 },
      );
    }

    try {
      const generated = await generateGroqContent(parsed.data);
      const structured = parseGeneratedContent(generated.content);
      const now = new Date();
      const rows = await prisma.$queryRaw<DraftRow[]>`
        INSERT INTO content_generator_drafts (
          id,
          tenant_id,
          user_id,
          title,
          content,
          model,
          source,
          status,
          meta_title,
          title_options,
          meta_description,
          description_options,
          slug,
          slug_options,
          strategy_summary,
          main_content,
          internal_links,
          image_alt_texts,
          faq,
          seo_notes,
          sections,
          created_at,
          updated_at
        )
        VALUES (
          ${randomUUID()},
          ${authorization.tenantId},
          ${userId},
          ${structured.title ?? parsed.data.topic},
          ${generated.content},
          ${generated.model},
          ${JSON.stringify(parsed.data)}::jsonb,
          'draft',
          ${structured.title},
          ${JSON.stringify(structured.titleOptions)}::jsonb,
          ${structured.description},
          ${JSON.stringify(structured.descriptionOptions)}::jsonb,
          ${structured.slug},
          ${JSON.stringify(structured.slugOptions)}::jsonb,
          ${structured.strategySummary},
          ${structured.mainContent},
          ${JSON.stringify(structured.internalLinks)}::jsonb,
          ${JSON.stringify(structured.imageAltTexts)}::jsonb,
          ${JSON.stringify(structured.faq)}::jsonb,
          ${JSON.stringify(structured.seoNotes)}::jsonb,
          ${JSON.stringify(structured.sections)}::jsonb,
          ${now},
          ${now}
        )
        RETURNING id, created_at
      `;

      return NextResponse.json({
        id: rows[0]?.id,
        content: generated.content,
        model: generated.model,
        structuredContent: structured,
        status: "draft",
        createdAt: rows[0]?.created_at.toISOString() ?? now.toISOString(),
      });
    } catch (error) {
      if (error instanceof GroqContentGenerationError) {
        return NextResponse.json(
          { message: error.message },
          { status: error.status },
        );
      }

      return NextResponse.json(
        { message: "Failed to generate content." },
        { status: 500 },
      );
    }
  });

export { POST };
