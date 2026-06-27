import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createRole } from "../services";

const useCreateRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createRole,
    onSuccess: () => {
      toast.success("Role created successfully");
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
    onError: () => {
      toast.error("Failed to create role");
    },
  });
};

export { useCreateRole };
