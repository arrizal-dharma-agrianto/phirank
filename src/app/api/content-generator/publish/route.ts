import { createHmac, randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { getAuthorizationContext } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { contentGeneratorPublishSchema } from "@/modules/content-generator/schemas";
import {
  parseGeneratedContent,
  type StructuredGeneratedContent,
} from "@/modules/content-generator/utils";

export const maxDuration = 60;

type IntegrationRow = {
  id: string;
  name: string;
  webhook_url: string;
  webhook_secret: string;
};

type IndexNowRow = {
  key: string;
  key_location: string;
  status: string;
};

type DraftRow = {
  id: string;
  content: string;
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
};

type IndexNowSubmissionResult = {
  submitted: boolean;
  status: "submitted" | "skipped" | "failed";
  message: string | null;
  submittedUrl: string | null;
};

const getContentTags = (sections: unknown) => {
  if (!sections || typeof sections !== "object") return [];

  const contentTags = (sections as { contentTags?: unknown }).contentTags;

  if (typeof contentTags !== "string") return [];

  return contentTags
    .split("\n")
    .map((line) => line.replace(/^\s*(?:[-*+]|\d+[.)])\s+/, "").trim())
    .filter(Boolean);
};

const createSignature = (payload: string, secret: string, timestamp: string) => {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");
};

const serializeDraftContent = (draft: DraftRow): StructuredGeneratedContent => ({
  raw: draft.content,
  title: draft.meta_title,
  titleOptions: draft.title_options as string[],
  description: draft.meta_description,
  descriptionOptions: draft.description_options as string[],
  slug: draft.slug,
  slugOptions: draft.slug_options as string[],
  strategySummary: draft.strategy_summary,
  mainContent: draft.main_content,
  internalLinks:
    draft.internal_links as StructuredGeneratedContent["internalLinks"],
  imageAltTexts: draft.image_alt_texts as string[],
  faq: draft.faq as StructuredGeneratedContent["faq"],
  seoNotes: draft.seo_notes as string[],
  contentTags: getContentTags(draft.sections),
  sections: draft.sections as StructuredGeneratedContent["sections"],
});

const findDraft = async (draftId: string | undefined, tenantId: string) => {
  if (!draftId) return null;

  const rows = await prisma.$queryRaw<DraftRow[]>`
    SELECT
      id,
      content,
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
      sections
    FROM content_generator_drafts
    WHERE id = ${draftId}
      AND tenant_id = ${tenantId}
    LIMIT 1
  `;

  return rows[0] ?? null;
};

const markDraftPublishFailed = async (
  draftId: string | undefined,
  tenantId: string,
  errorMessage: string,
) => {
  if (!draftId) return;

  await prisma.$executeRaw`
    UPDATE content_generator_drafts
    SET
      status = 'failed_to_publish',
      publish_error = ${errorMessage},
      updated_at = ${new Date()}
    WHERE id = ${draftId}
      AND tenant_id = ${tenantId}
  `;
};

const markDraftPublished = async (
  draftId: string | undefined,
  tenantId: string,
  deliveryId: string,
  statusCode: number,
) => {
  if (!draftId) return;

  const now = new Date();

  await prisma.$executeRaw`
    UPDATE content_generator_drafts
    SET
      status = 'published',
      publish_delivery_id = ${deliveryId},
      publish_status_code = ${statusCode},
      publish_error = NULL,
      published_at = ${now},
      updated_at = ${now}
    WHERE id = ${draftId}
      AND tenant_id = ${tenantId}
  `;
};

const readPublishedUrl = async (response: Response) => {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) return null;

  const data = (await response.json().catch(() => null)) as {
    publishedUrl?: unknown;
  } | null;
  const publishedUrl =
    typeof data?.publishedUrl === "string" ? data.publishedUrl.trim() : "";

  if (!publishedUrl) return null;

  try {
    const url = new URL(publishedUrl);

    if (!["http:", "https:"].includes(url.protocol)) return null;

    return url.toString();
  } catch {
    return null;
  }
};

const updateIndexNowStatus = async (
  tenantId: string,
  status: "ready" | "submission_failed",
  submittedUrl: string | null,
  lastError: string | null,
) => {
  await prisma.$executeRaw`
    UPDATE content_generator_indexnow
    SET
      status = ${status},
      last_submitted_url = ${submittedUrl},
      last_error = ${lastError},
      updated_at = ${new Date()}
    WHERE tenant_id = ${tenantId}
  `;
};

const submitUrlToIndexNow = async (
  tenantId: string,
  publishedUrl: string | null,
): Promise<IndexNowSubmissionResult> => {
  if (!publishedUrl) {
    const message =
      "Webhook response did not include publishedUrl, so IndexNow submission was skipped.";
    await updateIndexNowStatus(tenantId, "submission_failed", null, message);

    return {
      submitted: false,
      status: "failed",
      message,
      submittedUrl: null,
    };
  }

  const rows = await prisma.$queryRaw<IndexNowRow[]>`
    SELECT key, key_location, status
    FROM content_generator_indexnow
    WHERE tenant_id = ${tenantId}
    LIMIT 1
  `;
  const indexNow = rows[0];

  if (!indexNow || !["ready", "key_verified"].includes(indexNow.status)) {
    return {
      submitted: false,
      status: "skipped",
      message: "IndexNow is not ready. Verify the IndexNow key first.",
      submittedUrl: publishedUrl,
    };
  }

  let url: URL;

  try {
    url = new URL(publishedUrl);
  } catch {
    const message = "publishedUrl is not a valid URL.";
    await updateIndexNowStatus(
      tenantId,
      "submission_failed",
      publishedUrl,
      message,
    );

    return {
      submitted: false,
      status: "failed",
      message,
      submittedUrl: publishedUrl,
    };
  }

  try {
    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        host: url.host,
        key: indexNow.key,
        keyLocation: indexNow.key_location,
        urlList: [publishedUrl],
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const responseText = await response.text().catch(() => "");
      const message = responseText
        ? `IndexNow returned ${response.status}: ${responseText.slice(0, 240)}`
        : `IndexNow returned ${response.status}.`;
      await updateIndexNowStatus(
        tenantId,
        "submission_failed",
        publishedUrl,
        message,
      );

      return {
        submitted: false,
        status: "failed",
        message,
        submittedUrl: publishedUrl,
      };
    }

    await updateIndexNowStatus(tenantId, "ready", publishedUrl, null);

    return {
      submitted: true,
      status: "submitted",
      message: null,
      submittedUrl: publishedUrl,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? `IndexNow submission failed: ${error.message}`
        : "IndexNow submission failed.";
    await updateIndexNowStatus(
      tenantId,
      "submission_failed",
      publishedUrl,
      message,
    );

    return {
      submitted: false,
      status: "failed",
      message,
      submittedUrl: publishedUrl,
    };
  }
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

    const parsed = contentGeneratorPublishSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message:
            parsed.error.issues[0]?.message ?? "Invalid publish request.",
        },
        { status: 400 },
      );
    }

    const draft = await findDraft(parsed.data.contentId, authorization.tenantId);

    if (parsed.data.contentId && !draft) {
      return NextResponse.json(
        { message: "Generated content draft not found" },
        { status: 404 },
      );
    }

    const integrations = await prisma.$queryRaw<IntegrationRow[]>`
      SELECT id, name, webhook_url, webhook_secret
      FROM content_generator_integrations
      WHERE id = ${parsed.data.integrationId}
      AND tenant_id = ${authorization.tenantId}
      LIMIT 1
    `;

    const integration = integrations[0];

    if (!integration) {
      return NextResponse.json(
        { message: "Webhook integration not found" },
        { status: 404 },
      );
    }

    const deliveryId = randomUUID();
    const timestamp = new Date().toISOString();
    const content = draft
      ? serializeDraftContent(draft)
      : parseGeneratedContent(parsed.data.content);
    const payload = JSON.stringify({
      event: "content.generated",
      deliveryId,
      integration: {
        id: integration.id,
        name: integration.name,
      },
      content,
      contentTags: content.contentTags,
      model: parsed.data.model,
      source: parsed.data.source,
      publishedAt: timestamp,
    });
    const signature = createSignature(
      payload,
      integration.webhook_secret,
      timestamp,
    );

    let webhookResponse: Response;

    try {
      webhookResponse = await fetch(integration.webhook_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "phirank-webhook/1.0",
          "x-phirank-delivery-id": deliveryId,
          "x-phirank-event": "content.generated",
          "x-phirank-signature": `sha256=${signature}`,
          "x-phirank-timestamp": timestamp,
        },
        body: payload,
        signal: AbortSignal.timeout(15000),
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? `Webhook delivery failed: ${error.message}`
          : "Webhook delivery failed.";
      await markDraftPublishFailed(
        parsed.data.contentId,
        authorization.tenantId,
        message,
      );

      return NextResponse.json(
        {
          message,
        },
        { status: 502 },
      );
    }

    if (!webhookResponse.ok) {
      const responseText = await webhookResponse.text().catch(() => "");
      const message = responseText
        ? `Webhook returned ${webhookResponse.status}: ${responseText.slice(0, 240)}`
        : `Webhook returned ${webhookResponse.status}.`;
      await markDraftPublishFailed(
        parsed.data.contentId,
        authorization.tenantId,
        message,
      );

      return NextResponse.json(
        {
          message,
        },
        { status: 502 },
      );
    }

    const publishedUrl = await readPublishedUrl(webhookResponse.clone());
    const indexNowResult = parsed.data.submitToIndexNow
      ? await submitUrlToIndexNow(authorization.tenantId, publishedUrl)
      : ({
          submitted: false,
          status: "skipped",
          message: "IndexNow submission disabled for this publish.",
          submittedUrl: publishedUrl,
        } satisfies IndexNowSubmissionResult);

    await markDraftPublished(
      parsed.data.contentId,
      authorization.tenantId,
      deliveryId,
      webhookResponse.status,
    );

    return NextResponse.json({
      deliveryId,
      status: webhookResponse.status,
      publishedUrl,
      indexNow: indexNowResult,
      contentStatus: parsed.data.contentId ? "published" : undefined,
    });
  });

export { POST };
