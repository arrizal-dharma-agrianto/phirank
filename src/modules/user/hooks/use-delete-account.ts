import { useMutation } from "@tanstack/react-query";

import { deleteAccount } from "../services/profile.service";
import { toast } from "sonner";

export function useDeleteAccount() {
  return useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      toast.success("Account deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete account");
    },
  });
}