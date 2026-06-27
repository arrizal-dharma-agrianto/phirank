import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { assignRoleSchema } from "@/modules/rbac/schemas/role.schema";
import { getAuthorizationContext, hasPermission } from "@/lib/authorization";
import { canManageRole, canManageTenantMember } from "@/lib/rbac-role-access";

const POST = async (req: Request) =>
  withAuth(req, async ({ userId, body }) => {
    const authorization = await getAuthorizationContext(userId);

    if (!authorization) {
      return NextResponse.json(
        { message: "Tenant context not found" },
        { status: 403 },
      );
    }

    if (!hasPermission(authorization, "members.update_role")) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const parsed = assignRoleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Bad request" },
        { status: 400 },
      );
    }

    const { memberId, roleId } = parsed.data;

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

    const role = await prisma.role.findFirst({
      where: {
        id: roleId,
        OR: [
          { tenantId: authorization.tenantId },
          { tenantId: null, isSystem: true },
        ],
      },
      select: {
        id: true,
        slug: true,
        permissions: {
          select: {
            permission: {
              select: { key: true },
            },
          },
        },
      },
    });

    if (!role) {
      return NextResponse.json({ message: "Role not found" }, { status: 404 });
    }

    if (!canManageRole(authorization, role)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    if (member.role.slug === "owner" && role.slug !== "owner") {
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
          { message: "Cannot remove the last owner role" },
          { status: 403 },
        );
      }
    }

    await prisma.tenantMember.update({
      where: { id: memberId },
      data: { roleId },
    });

    return NextResponse.json({ message: "Role assigned" });
  });

export { POST };
