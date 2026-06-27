import { NextResponse } from "next/server";

import { getAuthorizationContext, hasPermission } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";

const POST = async (
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) => {
  const { token: invitationRef } = await params;

  return withAuth(req, async ({ userId }) => {
    const authorization = await getAuthorizationContext(userId);
    if (!authorization) {
      return NextResponse.json(
        { message: "Tenant context not found" },
        { status: 403 },
      );
    }

    if (!hasPermission(authorization, "members.invite")) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const invitation = await prisma.tenantInvitation.findUnique({
      where: { token: invitationRef },
      select: {
        id: true,
        email: true,
        tenantId: true,
        status: true,
      },
    }) ??
      (await prisma.tenantInvitation.findUnique({
        where: { id: invitationRef },
        select: {
          id: true,
          email: true,
          tenantId: true,
          status: true,
        },
      }));

    if (!invitation || invitation.tenantId !== authorization.tenantId) {
      return NextResponse.json(
        { message: "Invitation not found" },
        { status: 404 },
      );
    }

    if (invitation.status !== "PENDING") {
      return NextResponse.json(
        { message: "Only pending invitations can be revoked" },
        { status: 409 },
      );
    }

    const revokeResult = await prisma.tenantInvitation.updateMany({
      where: {
        tenantId: authorization.tenantId,
        email: invitation.email,
        status: "PENDING",
      },
      data: { status: "REVOKED" },
    });

    if (revokeResult.count === 0) {
      return NextResponse.json(
        { message: "Invitation is no longer pending" },
        { status: 409 },
      );
    }

    return NextResponse.json({ message: "Invitation revoked" });
  });
};

export { POST };
