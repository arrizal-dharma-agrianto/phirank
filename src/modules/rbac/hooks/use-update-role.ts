import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateRole } from "../services";

const useUpdateRole = (roleId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Parameters<typeof updateRole>[1]) =>
      updateRole(roleId, input),
    onSuccess: () => {
      toast.success("Role updated successfully");
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["roles", roleId] });
    },
    onError: () => {
      toast.error("Failed to update role");
    },
  });
};

export { useUpdateRole };
