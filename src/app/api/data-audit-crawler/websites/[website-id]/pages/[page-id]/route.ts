import { NextResponse } from "next/server";

import { getAuthorizationContext } from "@/lib/authorization";
import { withAuth } from "@/lib/with-auth";
import { getCrawlPageDetail } from "@/modules/data-audit-crawler/services/server/website.service";

type CrawlPageRouteContext = {
  params: Promise<{
    "website-id": string;
    "page-id": string;
  }>;
};

const GET = async (req: Request, { params }: CrawlPageRouteContext) =>
  withAuth(req, async ({ userId }) => {
    const authorization = await getAuthorizationContext(userId);

    if (!authorization) {
      return NextResponse.json(
        { message: "Tenant context not found" },
        { status: 403 },
      );
    }

    const { "website-id": websiteId, "page-id": pageId } = await params;
    const page = await getCrawlPageDetail(
      authorization.tenantId,
      websiteId,
      pageId,
    );

    if (!page) {
      return NextResponse.json(
        { message: "Crawled page not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(page);
  });

export { GET };
