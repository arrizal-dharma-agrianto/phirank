export type Invitation = {
  id: string;
  email: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  role: {
    id: string;
    name: string;
    slug: string;
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
};

export type InvitationDetail = Invitation & {
  invitedBy: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
};

export type CreateInvitationInput = {
  email: string;
  roleId: string;
};
