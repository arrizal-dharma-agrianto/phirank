import { PermissionGroup } from "../types";
import { getActiveTenantHeaders } from "@/modules/tenant/utils/active-tenant";

const getPermissions = async (): Promise<PermissionGroup[]> => {
  const res = await fetch("/api/rbac/permissions", {
    headers: getActiveTenantHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Failed to fetch permissions.");
  return data;
};

export { getPermissions };
