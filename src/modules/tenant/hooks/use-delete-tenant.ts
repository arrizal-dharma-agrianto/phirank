import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { deleteTenant } from "../services/tenant.service";

const useDeleteTenant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTenant,
    onSuccess: () => {
      toast.success("Tenant deleted successfully");

      queryClient.invalidateQueries({
        queryKey: ["my-tenants"],
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export { useDeleteTenant }