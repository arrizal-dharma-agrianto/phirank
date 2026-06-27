import { after, NextResponse } from "next/server";

import { getAuthorizationContext } from "@/lib/authorization";
import { withAuth } from "@/lib/with-auth";
import { pollRunningJobs } from "@/modules/data-audit-crawler/services/server/crawl-job.service";
import { listCrawlJobs } from "@/modules/data-audit-crawler/services/server/website.service";

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

    return NextResponse.json(await listCrawlJobs(authorization.tenantId));
  });

export { GET };
