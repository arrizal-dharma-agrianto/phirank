import { after, NextResponse } from "next/server";

import { getAuthorizationContext } from "@/lib/authorization";
import { withAuth } from "@/lib/with-auth";
import { getWebsiteDetail } from "@/modules/data-audit-crawler/services/server/website.service";
import { pollRunningJobs } from "@/modules/data-audit-crawler/services/server/crawl-job.service";

type WebsiteCrawlerRouteContext = {
  params: Promise<{
    "website-id": string;
  }>;
};

export const maxDuration = 60;

const parsePositiveInt = (value: string | null) => {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined;
};

const parseEnum = <T extends string>(
  value: string | null,
  allowed: readonly T[],
): T | undefined => {
  return allowed.includes(value as T) ? (value as T) : undefined;
};

const GET = async (req: Request, { params }: WebsiteCrawlerRouteContext) =>
  withAuth(req, async ({ userId }) => {
    const authorization = await getAuthorizationContext(userId);

    if (!authorization) {
      return NextResponse.json(
        { message: "Tenant context not found" },
        { status: 403 },
      );
    }

    const { "website-id": websiteId } = await params;
    const url = new URL(req.url);
    const searchParams = url.searchParams;

    after(() => pollRunningJobs(authorization.tenantId));

    const website = await getWebsiteDetail(authorization.tenantId, websiteId, {
      page: parsePositiveInt(searchParams.get("page")),
      pageSize: parsePositiveInt(searchParams.get("pageSize")),
      search: searchParams.get("search") ?? undefined,
      status: parseEnum(searchParams.get("status"), [
        "all",
        "success",
        "redirect",
        "error",
        "unknown",
      ]),
      indexability: parseEnum(searchParams.get("indexability"), [
        "all",
        "indexable",
        "noindex",
        "unknown",
      ]),
      sortBy: parseEnum(searchParams.get("sortBy"), [
        "url",
        "statusCode",
        "title",
        "wordCount",
        "missingAlt",
        "createdAt",
      ]),
      sortOrder: parseEnum(searchParams.get("sortOrder"), ["asc", "desc"]),
    });

    if (!website) {
      return NextResponse.json(
        { message: "Website not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(website);
  });

export { GET };
