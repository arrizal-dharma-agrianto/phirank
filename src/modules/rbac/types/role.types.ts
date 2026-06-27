export type Permission = {
  id: string;
  key: string;
  name: string;
  group: string | null;
};

export type PermissionGroup = {
  group: string;
  permissions: Permission[];
};

export type RoleWithPermissions = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isSystem: boolean;
  isDefault: boolean;
  tenantId: string | null;
  permissions: Permission[];
};

export type CreateRoleInput = {
  name: string;
  slug: string;
  description?: string;
  permissionIds: string[];
};

export type UpdateRoleInput = Partial<CreateRoleInput>;

export type AssignRoleInput = {
  memberId: string;
  roleId: string;
};

export type TenantMemberWithRole = {
  id: string;
  joinedAt: Date | null;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    status: string;
  };
  role: {
    id: string;
    name: string;
    slug: string;
    isSystem: boolean;
  };
  canRemove: boolean;
  canUpdateRole: boolean;
};
