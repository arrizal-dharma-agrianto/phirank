import { AssignRoleInput } from "../types";
import { getActiveTenantHeaders } from "@/modules/tenant/utils/active-tenant";

const assignRole = async (input: AssignRoleInput): Promise<void> => {
  const res = await fetch("/api/rbac/assign", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getActiveTenantHeaders(),
    },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Failed to assign role.");
};

export { assignRole };
