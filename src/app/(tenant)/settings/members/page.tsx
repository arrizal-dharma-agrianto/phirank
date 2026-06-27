import { getServerSession } from "next-auth";
import type { Metadata } from "next";
import { authOptions } from "@/lib/auth";
import { MemberList, PendingInvitationsList } from "@/modules/rbac";
import { InviteButton } from "@/modules/rbac/components/invite-button";

export const metadata: Metadata = {
  title: "Members",
  description: "Manage workspace members and their assigned roles.",
};

export default async function MembersPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Members</h2>
          <p className="text-sm text-muted-foreground">
            Manage members and their roles in this workspace
          </p>
        </div>
        <InviteButton />
      </div>

      <MemberList currentUserId={session?.user?.id ?? ""} />
      <PendingInvitationsList />
    </div>
  );
}
