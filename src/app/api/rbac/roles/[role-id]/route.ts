import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { updateRoleSchema } from "@/modules/rbac/schemas/role.schema";
import { getAuthorizationContext, hasPermission } from "@/lib/authorization";

type RoleRouteContext = {
  params: Promise<{
    "role-id": string;
  }>;
};

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

const GET = async (req: Request, { params }: RoleRouteContext) =>
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

    const { "role-id": roleId } = await params;
    const role = await prisma.role.findFirst({
      where: {
        id: roleId,
        OR: [
          { tenantId: authorization.tenantId },
          { tenantId: null, isSystem: true },
        ],
      },
      include: { permissions: { include: { permission: true } } },
    });

    if (!role) {
      return NextResponse.json({ message: "Role not found" }, { status: 404 });
    }

    return NextResponse.json(serializeRole(role));
  });

const PUT = async (req: Request, { params }: RoleRouteContext) =>
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

    const parsed = updateRoleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Bad request" },
        { status: 400 },
      );
    }

    const { "role-id": roleId } = await params;

    const existing = await prisma.role.findFirst({
      where: { id: roleId, tenantId: authorization.tenantId },
    });
    if (!existing) {
      return NextResponse.json({ message: "Role not found" }, { status: 404 });
    }

    if (existing.isSystem) {
      return NextResponse.json(
        { message: "Cannot edit system role" },
        { status: 403 },
      );
    }

    const { name, slug, description, permissionIds } = parsed.data;

    const role = await prisma.$transaction(async (tx) => {
      if (permissionIds !== undefined) {
        await tx.rolePermission.deleteMany({
          where: { roleId },
        });
        if (permissionIds.length > 0) {
          await tx.rolePermission.createMany({
            data: permissionIds.map((permissionId) => ({
              roleId,
              permissionId,
            })),
          });
        }
      }
      return tx.role.update({
        where: { id: roleId },
        data: { name, slug, description },
        include: { permissions: { include: { permission: true } } },
      });
    });

    return NextResponse.json(serializeRole(role));
  });

const DELETE = async (req: Request, { params }: RoleRouteContext) =>
  withAuth(req, async ({ userId }) => {
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

    const { "role-id": roleId } = await params;
    const role = await prisma.role.findFirst({
      where: {
        id: roleId,
        tenantId: authorization.tenantId,
      },
    });

    if (!role) {
      return NextResponse.json({ message: "Role not found" }, { status: 404 });
    }

    if (role.isSystem) {
      return NextResponse.json(
        { message: "Cannot delete system role" },
        { status: 403 },
      );
    }

    if (role.isDefault) {
      return NextResponse.json(
        { message: "Cannot delete default role" },
        { status: 403 },
      );
    }

    await prisma.role.delete({ where: { id: roleId } });

    return NextResponse.json({ message: "Role deleted" });
  });

export { GET, PUT, DELETE };
