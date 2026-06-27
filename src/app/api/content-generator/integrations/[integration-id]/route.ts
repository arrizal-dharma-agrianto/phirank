import { NextResponse } from "next/server";

import { getAuthorizationContext } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";

type ContentGeneratorIntegrationRouteContext = {
  params: Promise<{
    "integration-id": string;
  }>;
};

const DELETE = async (
  req: Request,
  { params }: ContentGeneratorIntegrationRouteContext,
) =>
  withAuth(req, async ({ userId }) => {
    const authorization = await getAuthorizationContext(userId);

    if (!authorization) {
      return NextResponse.json(
        { message: "Tenant context not found" },
        { status: 403 },
      );
    }

    const { "integration-id": integrationId } = await params;

    const result = await prisma.$executeRaw`
      DELETE FROM content_generator_integrations
      WHERE id = ${integrationId}
      AND tenant_id = ${authorization.tenantId}
    `;

    if (result === 0) {
      return NextResponse.json(
        { message: "Integration not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ message: "Integration deleted" });
  });

export { DELETE };
