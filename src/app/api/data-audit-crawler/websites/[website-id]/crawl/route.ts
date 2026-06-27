import { after, NextResponse } from "next/server";

import { getAuthorizationContext } from "@/lib/authorization";
import { withAuth } from "@/lib/with-auth";
import { pollCrawlJob } from "@/modules/data-audit-crawler/services/server/crawl-job.service";
import { startWebsiteCrawl } from "@/modules/data-audit-crawler/services/server/website.service";

type WebsiteCrawlerRouteContext = {
  params: Promise<{
    "website-id": string;
  }>;
};

export const maxDuration = 300;

const POST = async (req: Request, { params }: WebsiteCrawlerRouteContext) =>
  withAuth(req, async ({ userId }) => {
    const authorization = await getAuthorizationContext(userId);

    if (!authorization) {
      return NextResponse.json(
        { message: "Tenant context not found" },
        { status: 403 },
      );
    }

    const { "website-id": websiteId } = await params;

    try {
      const crawlJobId = await startWebsiteCrawl(
        authorization.tenantId,
        websiteId,
      );

      after(() => pollCrawlJob(crawlJobId));

      return NextResponse.json({ crawlJobId }, { status: 202 });
    } catch (error) {
      return NextResponse.json(
        {
          message:
            error instanceof Error
              ? error.message
              : "Failed to start crawling.",
        },
        { status: 400 },
      );
    }
  });

export { POST };
