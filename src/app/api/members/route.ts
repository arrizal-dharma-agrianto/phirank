import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { getAuthorizationContext, hasPermission } from "@/lib/authorization";
import { canManageTenantMember } from "@/lib/rbac-role-access";

const GET = async (req: Request) =>
  withAuth(req, async ({ userId }) => {
    const authorization = await getAuthorizationContext(userId);

    if (!authorization) {
      return NextResponse.json(
        { message: "Tenant context not found" },
        { status: 403 },
      );
    }

    if (!hasPermission(authorization, "members.read")) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const members = await prisma.tenantMember.findMany({
      where: { tenantId: authorization.tenantId },
      select: {
        id: true,
        userId: true,
        joinedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            status: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
            slug: true,
            isSystem: true,
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
      orderBy: { joinedAt: "asc" },
    });

    return NextResponse.json(
      members.map((member) => {
        const canManageMember = canManageTenantMember(authorization, member);

        return {
          id: member.id,
          joinedAt: member.joinedAt,
          user: member.user,
          role: {
            id: member.role.id,
            name: member.role.name,
            slug: member.role.slug,
            isSystem: member.role.isSystem,
          },
          canRemove:
            hasPermission(authorization, "members.remove") && canManageMember,
          canUpdateRole:
            hasPermission(authorization, "members.update_role") &&
            canManageMember,
        };
      }),
    );
  });

export { GET };
