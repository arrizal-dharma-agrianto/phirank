import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getTenantSettings, updateTenantSettings } from "../services";
import { useActiveTenant } from "./use-active-tenant";

const useTenantSettings = () => {
  const { activeTenantId } = useActiveTenant();

  return useQuery({
    queryKey: ["tenant-settings", activeTenantId],
    queryFn: getTenantSettings,
    enabled: !!activeTenantId,
  });
};

const useUpdateTenantSettings = () => {
  const { activeTenantId } = useActiveTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTenantSettings,
    onSuccess: (settings) => {
      queryClient.setQueryData(["tenant-settings", activeTenantId], settings);
    },
  });
};

export { useTenantSettings, useUpdateTenantSettings };
