import type {
  Invitation,
  InvitationDetail,
  CreateInvitationInput,
} from "../types/invitation.types";
import { getActiveTenantHeaders } from "@/modules/tenant/utils/active-tenant";

const getInvitations = async (): Promise<Invitation[]> => {
  const res = await fetch("/api/invitations", {
    headers: getActiveTenantHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Failed to fetch invitations.");
  return data;
};

const createInvitation = async (
  input: CreateInvitationInput,
): Promise<Invitation> => {
  const res = await fetch("/api/invitations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getActiveTenantHeaders(),
    },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Failed to send invitation.");
  return data;
};

const revokeInvitation = async (invitationId: string): Promise<void> => {
  const res = await fetch(
    `/api/invitations/${encodeURIComponent(invitationId)}/revoke`,
    {
      method: "POST",
      headers: getActiveTenantHeaders(),
    },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Failed to revoke invitation.");
};

const resendInvitation = async (invitationId: string): Promise<void> => {
  const res = await fetch(
    `/api/invitations/${encodeURIComponent(invitationId)}/resend`,
    {
      method: "POST",
      headers: getActiveTenantHeaders(),
    },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Failed to resend invitation.");
};

const getInvitationByToken = async (
  token: string,
): Promise<InvitationDetail> => {
  const res = await fetch(`/api/invitations/${encodeURIComponent(token)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Invitation not found.");
  return data;
};

const acceptInvitation = async (token: string): Promise<void> => {
  const res = await fetch(
    `/api/invitations/${encodeURIComponent(token)}/accept`,
    {
      method: "POST",
    },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Failed to accept invitation.");
};

export {
  getInvitations,
  createInvitation,
  revokeInvitation,
  resendInvitation,
  getInvitationByToken,
  acceptInvitation,
};
