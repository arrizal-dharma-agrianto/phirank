import { after, NextResponse } from "next/server";

import { getAuthorizationContext } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { getConfiguredWebsite } from "@/modules/data-audit-crawler/services/server/website.service";
import { webAuditSchema } from "@/modules/web-audit/schemas";
import { analyzeWebsiteUrl, serializeWebAudit } from "@/modules/web-audit/utils";

export const maxDuration = 60;

const USER_RATE_LIMIT_WINDOW_MS = 60_000;
const USER_RATE_LIMIT_MAX = 5;
const USER_DAILY_AUDIT_MAX = 50;
const TENANT_DAILY_AUDIT_MAX = 250;

const getStartOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const getRateLimitWindowStart = () => {
  return new Date(Date.now() - USER_RATE_LIMIT_WINDOW_MS);
};

const webAuditSelect = {
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
} as const;

const processWebAudit = async (auditId: string, url: string) => {
  const updateProgress = async (progress: number, currentStep: string) => {
    await prisma.webAudit.update({
      where: { id: auditId },
      data: {
        progress,
        currentStep,
        status: "RUNNING",
      },
    });
  };

  try {
    await updateProgress(10, "Starting audit");

    const result = await analyzeWebsiteUrl(url, {
      onProgress: updateProgress,
    });

    await prisma.webAudit.update({
      where: { id: auditId },
      data: {
        url: result.url,
        status: "COMPLETED",
        progress: 100,
        currentStep: "Audit completed",
        overallScore: result.overallScore,
        categories: result.categories,
        findings: result.findings,
        errorMessage: null,
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to analyze the target URL.";

    await prisma.webAudit.update({
      where: { id: auditId },
      data: {
        status: "FAILED",
        progress: 100,
        currentStep: "Audit failed",
        overallScore: 0,
        categories: [],
        findings: [
          {
            title: "Audit failed",
            description: errorMessage,
            severity: "High",
          },
        ],
        errorMessage,
      },
    });
  }
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

    const audits = await prisma.webAudit.findMany({
      where: {
        tenantId: authorization.tenantId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 25,
      select: webAuditSelect,
    });

    return NextResponse.json(audits.map(serializeWebAudit));
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

    const parsed = webAuditSchema.safeParse(body ?? {});

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Invalid audit URL" },
        { status: 400 },
      );
    }

    const configuredWebsite =
      !parsed.data.url && parsed.data.websiteId
        ? (
            await prisma.$queryRaw<
              {
                id: string;
                start_url: string;
              }[]
            >`
              SELECT id, start_url
              FROM websites
              WHERE id = ${parsed.data.websiteId}
                AND tenant_id = ${authorization.tenantId}
              LIMIT 1
            `
          )[0]
        : await getConfiguredWebsite(authorization.tenantId);

    if (!configuredWebsite) {
      return NextResponse.json(
        {
          message:
            "Configure a website in workspace settings before running an audit.",
        },
        { status: 400 },
      );
    }

    const auditUrl =
      parsed.data.url ??
      ("startUrl" in configuredWebsite
        ? configuredWebsite.startUrl
        : configuredWebsite.start_url);

    const [recentUserAudits, todayUserAudits, todayTenantAudits] =
      await Promise.all([
        prisma.webAudit.count({
          where: {
            userId,
            createdAt: {
              gte: getRateLimitWindowStart(),
            },
          },
        }),
        prisma.webAudit.count({
          where: {
            userId,
            createdAt: {
              gte: getStartOfToday(),
            },
          },
        }),
        prisma.webAudit.count({
          where: {
            tenantId: authorization.tenantId,
            createdAt: {
              gte: getStartOfToday(),
            },
          },
        }),
      ]);

    if (recentUserAudits >= USER_RATE_LIMIT_MAX) {
      return NextResponse.json(
        {
          message: `Rate limit exceeded. Try again in a minute.`,
          limit: USER_RATE_LIMIT_MAX,
          windowSeconds: USER_RATE_LIMIT_WINDOW_MS / 1000,
        },
        { status: 429 },
      );
    }

    if (todayUserAudits >= USER_DAILY_AUDIT_MAX) {
      return NextResponse.json(
        {
          message: `Daily user audit limit reached (${USER_DAILY_AUDIT_MAX}/day).`,
          limit: USER_DAILY_AUDIT_MAX,
        },
        { status: 429 },
      );
    }

    if (todayTenantAudits >= TENANT_DAILY_AUDIT_MAX) {
      return NextResponse.json(
        {
          message: `Daily workspace audit limit reached (${TENANT_DAILY_AUDIT_MAX}/day).`,
          limit: TENANT_DAILY_AUDIT_MAX,
        },
        { status: 429 },
      );
    }

    const audit = await prisma.webAudit.create({
      data: {
        tenantId: authorization.tenantId,
        userId,
        url: auditUrl,
        status: "QUEUED",
        progress: 5,
        currentStep: "Queued",
        overallScore: 0,
        categories: [],
        findings: [],
        errorMessage: null,
      },
      select: webAuditSelect,
    });

    after(() => processWebAudit(audit.id, auditUrl));

    return NextResponse.json(serializeWebAudit(audit), { status: 202 });
  });

export { GET, POST };
