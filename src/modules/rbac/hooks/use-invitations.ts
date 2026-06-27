import { useQuery } from "@tanstack/react-query";
import { useActiveTenant } from "@/modules/tenant/hooks";
import {
  getInvitations,
  getInvitationByToken,
} from "../services/invitation.service";

const useInvitations = () => {
  const { activeTenantId } = useActiveTenant();

  return useQuery({
    queryKey: ["invitations", activeTenantId],
    queryFn: getInvitations,
    enabled: !!activeTenantId,
  });
};

const useInvitationByToken = (token: string) => {
  return useQuery({
    queryKey: ["invitations", token],
    queryFn: () => getInvitationByToken(token),
    enabled: !!token,
    retry: false,
  });
};

export { useInvitations, useInvitationByToken };
