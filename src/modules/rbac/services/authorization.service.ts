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

export const getMyPermissions = async (): Promise<string[]> => {
  const res = await fetch("/api/rbac/permissions/me");
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Failed to fetch permissions.");
  return data;
};
