import { NextResponse } from "next/server";

import { getAuthorizationContext } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { serializeWebAudit } from "@/modules/web-audit/utils";

type WebAuditRouteContext = {
  params: Promise<{
    "audit-id": string;
  }>;
};

const GET = async (req: Request, { params }: WebAuditRouteContext) =>
  withAuth(req, async ({ userId }) => {
    const authorization = await getAuthorizationContext(userId);

    if (!authorization) {
      return NextResponse.json(
        { message: "Tenant context not found" },
        { status: 403 },
      );
    }

    const { "audit-id": auditId } = await params;

    const audit = await prisma.webAudit.findFirst({
      where: {
        id: auditId,
        tenantId: authorization.tenantId,
      },
      select: {
        id: true,
        url: true,
        status: true,
        progress: true,
        currentStep: true,
        overallScore: true,
        categories: true,
        findings: true,
        errorMessage: true,
        createdAt: true,
      },
    });

    if (!audit) {
      return NextResponse.json(
        { message: "Website audit not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(serializeWebAudit(audit));
  });

const DELETE = async (req: Request, { params }: WebAuditRouteContext) =>
  withAuth(req, async ({ userId }) => {
    const authorization = await getAuthorizationContext(userId);

    if (!authorization) {
      return NextResponse.json(
        { message: "Tenant context not found" },
        { status: 403 },
      );
    }

    const { "audit-id": auditId } = await params;

    const audit = await prisma.webAudit.findFirst({
      where: {
        id: auditId,
        tenantId: authorization.tenantId,
      },
      select: {
        id: true,
      },
    });

    if (!audit) {
      return NextResponse.json(
        { message: "Website audit not found" },
        { status: 404 },
      );
    }

    await prisma.webAudit.delete({
      where: {
        id: audit.id,
      },
    });

    return NextResponse.json({ message: "Website audit deleted" });
  });

export { DELETE, GET };
