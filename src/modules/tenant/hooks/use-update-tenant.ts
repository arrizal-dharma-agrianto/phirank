import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { updateTenant } from "../services/tenant.service";

const useUpdateTenant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTenant,
    onSuccess: () => {
      toast.success("Tenant updated successfully");

      queryClient.invalidateQueries({
        queryKey: ["my-tenants"],
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export { useUpdateTenant };