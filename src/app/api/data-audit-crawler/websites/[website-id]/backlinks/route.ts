import { NextResponse } from "next/server";

import { getAuthorizationContext } from "@/lib/authorization";
import { withAuth } from "@/lib/with-auth";
import { refreshBacklinkProfile } from "@/modules/data-audit-crawler/services/server/website.service";

type BacklinkProfileRouteContext = {
  params: Promise<{
    "website-id": string;
  }>;
};

export const maxDuration = 60;

const POST = async (req: Request, { params }: BacklinkProfileRouteContext) =>
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
      const backlinkProfile = await refreshBacklinkProfile(
        authorization.tenantId,
        websiteId,
      );

      return NextResponse.json(backlinkProfile);
    } catch (error) {
      return NextResponse.json(
        {
          message:
            error instanceof Error
              ? error.message
              : "Failed to refresh backlink profile.",
        },
        { status: 400 },
      );
    }
  });

export { POST };
