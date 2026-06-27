import { useMutation } from "@tanstack/react-query";
import { updatePassword } from "../services";
import { toast } from "sonner";

const useUpdatePassword = () => {
  return useMutation({
    mutationFn: updatePassword,
    onSuccess: () => {
      toast.success("Password updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update password", {
        description: error instanceof Error ? error.message : undefined,
      });
    },
  });
}

export { useUpdatePassword }