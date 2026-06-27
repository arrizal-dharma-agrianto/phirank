import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { assignRole } from "../services";

const useAssignRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: assignRole,
    onSuccess: () => {
      toast.success("Role assigned successfully");
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
    onError: () => {
      toast.error("Failed to assign role");
    },
  });
};

export { useAssignRole };
