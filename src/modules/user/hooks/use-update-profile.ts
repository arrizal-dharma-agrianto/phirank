import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateProfile } from "../services";
import { toast } from "sonner";

const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      toast.success("Profile updated successfully", {
        id: "profile-update",
      });
      queryClient.invalidateQueries({
        queryKey: ["profile"],
      });
    },
    onError: () => {
      toast.error("Failed to update profile", {
        id: "profile-update",
      });
    },
  });
}

export { useUpdateProfile };
