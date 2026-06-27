import { useQuery } from "@tanstack/react-query";
import { useActiveTenant } from "@/modules/tenant/hooks";
import { getAssignableRoles, getRoles, getRole } from "../services";

const useRoles = () => {
  const { activeTenantId } = useActiveTenant();

  return useQuery({
    queryKey: ["roles", activeTenantId],
    queryFn: getRoles,
    enabled: !!activeTenantId,
  });
};

const useRole = (roleId: string) => {
  const { activeTenantId } = useActiveTenant();

  return useQuery({
    queryKey: ["roles", activeTenantId, roleId],
    queryFn: () => getRole(roleId),
    enabled: !!activeTenantId && !!roleId,
  });
};

const useAssignableRoles = () => {
  const { activeTenantId } = useActiveTenant();

  return useQuery({
    queryKey: ["roles", activeTenantId, "assignable"],
    queryFn: getAssignableRoles,
    enabled: !!activeTenantId,
  });
};

export { useRoles, useRole, useAssignableRoles };
