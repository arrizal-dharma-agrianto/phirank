import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { AuthorizationContext } from "@/modules/rbac/types";
import {
  ACTIVE_TENANT_COOKIE_KEY,
  ACTIVE_TENANT_HEADER,
} from "@/modules/tenant/utils/active-tenant";

export const rbacPermissionKeys = [
  "members.read",
  "members.invite",
  "members.remove",
  "members.update_role",
  "roles.read",
  "roles.manage",
  "settings.manage",
  "projects.read",
  "projects.create",
  "projects.update",
  "projects.delete",
  "analytics.read",
  "audit_logs.read",
] as const;

export type RbacPermissionKey = (typeof rbacPermissionKeys)[number];
export const ACTIVE_TENANT_COOKIE = ACTIVE_TENANT_COOKIE_KEY;
const LEGACY_ACTIVE_TENANT_COOKIE = "active_tenant_id";

const selectAuthorizationContext = async (
  userId: string,
  tenantId?: string,
): Promise<AuthorizationContext | null> => {
  const membership = await prisma.tenantMember.findFirst({
    where: {
      userId,
      ...(tenantId ? { tenantId } : {}),
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      role: {
        select: {
          id: true,
          name: true,
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
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
        },
      },
    },
  });

  if (tenantId && !membership) return null;

  const fallbackMembership =
    membership ??
    (await prisma.tenantMember.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        role: {
          select: {
            id: true,
            name: true,
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
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
      },
    }));

  if (!fallbackMembership) return null;

  return {
    membershipId: fallbackMembership.id,
    permissionKeys: fallbackMembership.role.permissions.map(
      (rp) => rp.permission.key,
    ),
    roleId: fallbackMembership.role.id,
    roleName: fallbackMembership.role.name,
    roleSlug: fallbackMembership.role.slug,
    tenantId: fallbackMembership.tenant.id,
    tenantName: fallbackMembership.tenant.name,
    tenantSlug: fallbackMembership.tenant.slug,
    tenantStatus: fallbackMembership.tenant.status,
    userId,
  };
};

// Hanya dipanggil di API routes / Server Actions
export const getAuthorizationContext = async (
  userId: string,
): Promise<AuthorizationContext | null> => {
  const cookieStore = await cookies();
  const headersList = await headers();
  const activeTenantIds = [
    headersList.get(ACTIVE_TENANT_HEADER),
    cookieStore.get(ACTIVE_TENANT_COOKIE)?.value,
    cookieStore.get(LEGACY_ACTIVE_TENANT_COOKIE)?.value,
  ].filter((tenantId): tenantId is string => Boolean(tenantId));

  for (const tenantId of activeTenantIds) {
    const authorization = await selectAuthorizationContext(userId, tenantId);

    if (authorization) {
      return authorization;
    }
  }

  return selectAuthorizationContext(userId);
};

export const hasPermission = (
  context: AuthorizationContext,
  permission: RbacPermissionKey,
): boolean => {
  return context.permissionKeys.includes(permission);
};
