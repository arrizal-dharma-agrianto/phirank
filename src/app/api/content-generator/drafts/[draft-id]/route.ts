import { NextResponse } from "next/server";

import { getAuthorizationContext } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";

type DraftDetailRow = {
  id: string;
  title: string;
  content: string;
  model: string | null;
  source: unknown;
  status: string;
  meta_title: string | null;
  title_options: unknown;
  meta_description: string | null;
  description_options: unknown;
  slug: string | null;
  slug_options: unknown;
  strategy_summary: string | null;
  main_content: string | null;
  internal_links: unknown;
  image_alt_texts: unknown;
  faq: unknown;
  seo_notes: unknown;
  sections: unknown;
  publish_delivery_id: string | null;
  publish_status_code: number | null;
  publish_error: string | null;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

const serializeDraft = (draft: DraftDetailRow) => ({
  id: draft.id,
  title: draft.title,
  content: draft.content,
  model: draft.model,
  structuredContent: {
    raw: draft.content,
    title: draft.meta_title,
    titleOptions: draft.title_options,
    description: draft.meta_description,
    descriptionOptions: draft.description_options,
    slug: draft.slug,
    slugOptions: draft.slug_options,
    strategySummary: draft.strategy_summary,
    mainContent: draft.main_content,
    internalLinks: draft.internal_links,
    imageAltTexts: draft.image_alt_texts,
    faq: draft.faq,
    seoNotes: draft.seo_notes,
    sections: draft.sections,
  },
  source: draft.source,
  status: draft.status,
  publishDeliveryId: draft.publish_delivery_id,
  publishStatusCode: draft.publish_status_code,
  publishError: draft.publish_error,
  publishedAt: draft.published_at?.toISOString() ?? null,
  createdAt: draft.created_at.toISOString(),
  updatedAt: draft.updated_at.toISOString(),
});

const GET = async (
  req: Request,
  { params }: { params: Promise<{ "draft-id": string }> },
) =>
  withAuth(req, async ({ userId }) => {
    const authorization = await getAuthorizationContext(userId);

    if (!authorization) {
      return NextResponse.json(
        { message: "Tenant context not found" },
        { status: 403 },
      );
    }

    const draftId = (await params)["draft-id"];
    const drafts = await prisma.$queryRaw<DraftDetailRow[]>`
      SELECT
        id,
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
        publish_delivery_id,
        publish_status_code,
        publish_error,
        published_at,
        created_at,
        updated_at
      FROM content_generator_drafts
      WHERE id = ${draftId}
        AND tenant_id = ${authorization.tenantId}
      LIMIT 1
    `;
    const draft = drafts[0];

    if (!draft) {
      return NextResponse.json(
        { message: "Generated content draft not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(serializeDraft(draft));
  });

const DELETE = async (
  req: Request,
  { params }: { params: Promise<{ "draft-id": string }> },
) =>
  withAuth(req, async ({ userId }) => {
    const authorization = await getAuthorizationContext(userId);

    if (!authorization) {
      return NextResponse.json(
        { message: "Tenant context not found" },
        { status: 403 },
      );
    }

    const draftId = (await params)["draft-id"];
    const result = await prisma.$executeRaw`
      DELETE FROM content_generator_drafts
      WHERE id = ${draftId}
        AND tenant_id = ${authorization.tenantId}
    `;

    if (result === 0) {
      return NextResponse.json(
        { message: "Generated content draft not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ message: "Generated content draft deleted" });
  });

export { DELETE, GET };
