import { useQuery } from "@tanstack/react-query";
import { useActiveTenant } from "@/modules/tenant/hooks";
import { getMembers } from "../services/role.service";

const useMembers = () => {
  const { activeTenantId } = useActiveTenant();

  return useQuery({
    queryKey: ["members", activeTenantId],
    queryFn: getMembers,
    enabled: !!activeTenantId,
  });
};

export { useMembers };
