import { randomBytes, randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { getAuthorizationContext } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { contentGeneratorIntegrationSchema } from "@/modules/content-generator/schemas";

type IntegrationRow = {
  id: string;
  name: string;
  webhook_url: string;
  created_at: Date;
};

const createWebhookSecret = () => {
  return `whsec_${randomBytes(32).toString("base64url")}`;
};

const serializeIntegration = (integration: IntegrationRow) => {
  return {
    id: integration.id,
    name: integration.name,
    webhookUrl: integration.webhook_url,
    createdAt: integration.created_at.toISOString(),
  };
};

const GET = async (req: Request) =>
  withAuth(req, async ({ userId }) => {
    const authorization = await getAuthorizationContext(userId);

    if (!authorization) {
      return NextResponse.json(
        { message: "Tenant context not found" },
        { status: 403 },
      );
    }

    const integrations = await prisma.$queryRaw<IntegrationRow[]>`
      SELECT id, name, webhook_url, created_at
      FROM content_generator_integrations
      WHERE tenant_id = ${authorization.tenantId}
      ORDER BY created_at DESC
    `;

    return NextResponse.json(integrations.map(serializeIntegration));
  });

const POST = async (req: Request) =>
  withAuth(req, async ({ userId, body }) => {
    const authorization = await getAuthorizationContext(userId);

    if (!authorization) {
      return NextResponse.json(
        { message: "Tenant context not found" },
        { status: 403 },
      );
    }

    const parsed = contentGeneratorIntegrationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message:
            parsed.error.issues[0]?.message ?? "Invalid integration request.",
        },
        { status: 400 },
      );
    }

    const webhookSecret = createWebhookSecret();
    const now = new Date();

    try {
      const integrations = await prisma.$queryRaw<IntegrationRow[]>`
        INSERT INTO content_generator_integrations (
          id,
          tenant_id,
          name,
          webhook_url,
          webhook_secret,
          created_at,
          updated_at
        )
        VALUES (
          ${randomUUID()},
          ${authorization.tenantId},
          ${parsed.data.name},
          ${parsed.data.webhookUrl},
          ${webhookSecret},
          ${now},
          ${now}
        )
        RETURNING id, name, webhook_url, created_at
      `;

      return NextResponse.json(
        {
          ...serializeIntegration(integrations[0]),
          webhookSecret,
        },
        { status: 201 },
      );
    } catch {
      return NextResponse.json(
        {
          message:
            "This webhook is already configured for the active workspace.",
        },
        { status: 409 },
      );
    }
  });

export { GET, POST };
