import { PermissionMatrix } from "@/modules/rbac";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit Role",
  description: "Update permissions for a workspace role.",
};

export default function RoleDetailPage({
  params,
}: {
  params: { roleId: string };
}) {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Edit Role</h2>
        <p className="text-sm text-muted-foreground">
          Set the permissions for this role
        </p>
      </div>

      <PermissionMatrix roleId={params.roleId} />
    </div>
  );
}
