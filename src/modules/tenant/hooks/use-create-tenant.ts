import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTenant } from "../services";
import type { Tenant } from "../types";
import { toast } from "sonner";

const useCreateTenant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTenant,

    onSuccess: (tenant) => {
      queryClient.setQueryData<Tenant[]>(["my-tenants"], (current) => {
        if (!current) return [tenant];
        if (current.some((item) => item.tenant.id === tenant.tenant.id)) {
          return current;
        }

        return [...current, tenant];
      });

      queryClient.invalidateQueries({
        queryKey: ["my-tenants"],
      });

      toast.success("Tenant created successfully");
    },

    onError: () => {
      toast.error("Failed to create tenant");
    },
  });
};

export { useCreateTenant };
