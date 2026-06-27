import { NextResponse } from "next/server";

import { getAuthorizationContext } from "@/lib/authorization";
import { withAuth } from "@/lib/with-auth";
import { deleteCrawlJob } from "@/modules/data-audit-crawler/services/server/website.service";

type CrawlJobRouteContext = {
  params: Promise<{
    "crawl-job-id": string;
  }>;
};

const DELETE = async (req: Request, { params }: CrawlJobRouteContext) =>
  withAuth(req, async ({ userId }) => {
    const authorization = await getAuthorizationContext(userId);

    if (!authorization) {
      return NextResponse.json(
        { message: "Tenant context not found" },
        { status: 403 },
      );
    }

    const { "crawl-job-id": crawlJobId } = await params;
    const deleted = await deleteCrawlJob(authorization.tenantId, crawlJobId);

    if (!deleted) {
      return NextResponse.json(
        { message: "Crawl job not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ message: "Crawl job deleted" });
  });

export { DELETE };
