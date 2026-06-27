import type { AuthorizationContext } from "@/modules/rbac/types";

type RolePermissionRecord = {
  permission: {
    key: string;
  };
};

type ManageableRole = {
  slug: string;
  permissions: RolePermissionRecord[];
};

type ManageableMember = {
  userId: string;
  role: ManageableRole;
};

const isOwner = (authorization: AuthorizationContext) =>
  authorization.roleSlug === "owner";

const hasOnlyAllowedPermissions = (
  authorization: AuthorizationContext,
  role: ManageableRole,
) => {
  if (isOwner(authorization)) return true;

  const currentPermissionKeys = new Set(authorization.permissionKeys);

  return role.permissions.every((rolePermission) =>
    currentPermissionKeys.has(rolePermission.permission.key),
  );
};

export const canManageRole = (
  authorization: AuthorizationContext,
  role: ManageableRole,
) => hasOnlyAllowedPermissions(authorization, role);

export const canManageTenantMember = (
  authorization: AuthorizationContext,
  member: ManageableMember,
) => {
  if (member.userId === authorization.userId) return false;

  return canManageRole(authorization, member.role);
};
