import { NextResponse } from "next/server";

import { getAuthorizationContext, hasPermission } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { canManageTenantMember } from "@/lib/rbac-role-access";
import { withAuth } from "@/lib/with-auth";

type MemberRouteContext = {
  params: Promise<{
    "member-id": string;
  }>;
};

const DELETE = async (req: Request, { params }: MemberRouteContext) =>
  withAuth(req, async ({ userId }) => {
    const authorization = await getAuthorizationContext(userId);

    if (!authorization) {
      return NextResponse.json(
        { message: "Tenant context not found" },
        { status: 403 },
      );
    }

    if (!hasPermission(authorization, "members.remove")) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { "member-id": memberId } = await params;

    const member = await prisma.tenantMember.findFirst({
      where: {
        id: memberId,
        tenantId: authorization.tenantId,
      },
      select: {
        id: true,
        userId: true,
        role: {
          select: {
            slug: true,
            permissions: {
              select: {
                permission: {
                  select: { key: true },
                },
              },
            },
          },
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        { message: "Member not found" },
        { status: 404 },
      );
    }

    if (!canManageTenantMember(authorization, member)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    if (member.role.slug === "owner") {
      const ownerCount = await prisma.tenantMember.count({
        where: {
          tenantId: authorization.tenantId,
          role: {
            slug: "owner",
            tenantId: null,
            isSystem: true,
          },
        },
      });

      if (ownerCount <= 1) {
        return NextResponse.json(
          { message: "Cannot remove the last owner" },
          { status: 403 },
        );
      }
    }

    await prisma.tenantMember.delete({ where: { id: member.id } });

    return NextResponse.json({ message: "Member removed" });
  });

export { DELETE };
