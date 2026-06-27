import type { Metadata } from "next";

import { InviteClient } from "./invite-client";

export const metadata: Metadata = {
  title: "Invitation",
  description: "Review and accept your workspace invitation.",
};

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return <InviteClient token={token} />;
}
