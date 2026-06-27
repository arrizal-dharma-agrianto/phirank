import { useQuery } from "@tanstack/react-query";
import { useActiveTenant } from "@/modules/tenant/hooks";
import { getPermissions } from "../services";

const usePermissions = () => {
  const { activeTenantId } = useActiveTenant();

  return useQuery({
    queryKey: ["permissions", activeTenantId],
    queryFn: getPermissions,
    enabled: !!activeTenantId,
    staleTime: 1000 * 60 * 10, // 10 menit, permissions jarang berubah
  });
};

export { usePermissions };
