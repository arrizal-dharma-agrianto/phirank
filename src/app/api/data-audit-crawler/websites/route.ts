import { after, NextResponse } from "next/server";

import { getAuthorizationContext } from "@/lib/authorization";
import { withAuth } from "@/lib/with-auth";
import { websiteCrawlerSchema } from "@/modules/data-audit-crawler/schemas";
import {
  createWebsiteAndStartCrawl,
  listWebsites,
} from "@/modules/data-audit-crawler/services/server/website.service";
import {
  pollRunningJobs,
} from "@/modules/data-audit-crawler/services/server/crawl-job.service";

export const maxDuration = 60;

const GET = async (req: Request) =>
  withAuth(req, async ({ userId }) => {
    const authorization = await getAuthorizationContext(userId);

    if (!authorization) {
      return NextResponse.json(
        { message: "Tenant context not found" },
        { status: 403 },
      );
    }

    after(() => pollRunningJobs(authorization.tenantId));

    const websites = await listWebsites(authorization.tenantId);

    return NextResponse.json(websites);
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

    const parsed = websiteCrawlerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message:
            parsed.error.issues[0]?.message ?? "Invalid crawler website.",
        },
        { status: 400 },
      );
    }

    try {
      const result = await createWebsiteAndStartCrawl(
        authorization.tenantId,
        userId,
        parsed.data,
      );

      // after(() => pollCrawlJob(result.crawlJobId));

      return NextResponse.json(result, { status: 202 });
    } catch (error) {
      return NextResponse.json(
        {
          message:
            error instanceof Error
              ? error.message
              : "Failed to create crawler website.",
        },
        { status: 400 },
      );
    }
  });

export { GET, POST };
