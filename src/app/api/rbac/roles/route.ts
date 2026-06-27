import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { createRoleSchema } from "@/modules/rbac/schemas/role.schema";
import { getAuthorizationContext, hasPermission } from "@/lib/authorization";
import { canManageRole } from "@/lib/rbac-role-access";

const serializeRole = (
  role: {
    permissions: Array<{
      permission: {
        id: string;
        key: string;
        name: string;
        group: string | null;
      };
    }>;
  } & Record<string, unknown>,
) => ({
  ...role,
  permissions: role.permissions.map(
    (rolePermission) => rolePermission.permission,
  ),
});

const GET = async (req: Request) =>
  withAuth(req, async ({ userId }) => {
    const authorization = await getAuthorizationContext(userId);

    if (!authorization) {
      return NextResponse.json(
        { message: "Tenant context not found" },
        { status: 403 },
      );
    }

    if (!hasPermission(authorization, "roles.read")) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope");

    const roles = await prisma.role.findMany({
      where: {
        OR: [
          { tenantId: authorization.tenantId },
          { tenantId: null, isSystem: true },
        ],
      },
      include: {
        permissions: { include: { permission: true } },
      },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    });

    const visibleRoles =
      scope === "assignable"
        ? roles.filter((role) => canManageRole(authorization, role))
        : roles;

    return NextResponse.json(visibleRoles.map(serializeRole));
  });

const POST = async (req: Request) =>
  withAuth(req, async ({ userId, body }) => {
    const authorization = await getAuthorizationContext(userId);

    if (!authorization) {
      return NextResponse.json(
        { message: "Tenant context not found" },
        { status: 403 },
      );
    }

    if (!hasPermission(authorization, "roles.manage")) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const parsed = createRoleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Bad request" },
        { status: 400 },
      );
    }

    const { name, slug, description, permissionIds } = parsed.data;
    const permissionCreates = permissionIds.map((permissionId) => ({
      permissionId,
    }));

    const role = await prisma.role.create({
      data: {
        tenantId: authorization.tenantId,
        name,
        slug,
        description,
        ...(permissionCreates.length > 0
          ? {
              permissions: {
                create: permissionCreates,
              },
            }
          : {}),
      },
      include: {
        permissions: { include: { permission: true } },
      },
    });

    return NextResponse.json(serializeRole(role));
  });

export { GET, POST };
