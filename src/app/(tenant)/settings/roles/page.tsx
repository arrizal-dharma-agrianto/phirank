import { RoleList } from "@/modules/rbac/components/role-list";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Roles & Permissions",
  description: "Manage workspace roles and access permissions.",
};

export default function RolesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Roles & Permissions</h2>
        <p className="text-sm text-muted-foreground">
          Manage roles and access permissions for members of this workspace
        </p>
      </div>

      <RoleList />
    </div>
  );
}
