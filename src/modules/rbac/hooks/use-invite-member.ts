import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  acceptInvitation,
  createInvitation,
  resendInvitation,
  revokeInvitation,
} from "../services/invitation.service";

const useInviteMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createInvitation,
    onSuccess: () => {
      toast.success("Invitation sent successfully");
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
    },
    onError: (error: Error) => {
      toast.error(error.message ?? "Failed to send invitation");
    },
  });
};

const useRevokeInvitation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: revokeInvitation,
    onSuccess: () => {
      toast.success("Invitation revoked");
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
    },
    onError: () => {
      toast.error("Failed to revoke invitation");
    },
  });
};

const useResendInvitation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resendInvitation,
    onSuccess: () => {
      toast.success("Invitation resent");
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
    },
    onError: (error: Error) => {
      toast.error(error.message ?? "Failed to resend invitation");
    },
  });
};

const useAcceptInvitation = (token: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => acceptInvitation(token),
    onSuccess: () => {
      toast.success("Invitation accepted! Welcome to the team.");
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (error: Error) => {
      toast.error(error.message ?? "Failed to accept invitation");
    },
  });
};

export {
  useInviteMember,
  useRevokeInvitation,
  useResendInvitation,
  useAcceptInvitation,
};
