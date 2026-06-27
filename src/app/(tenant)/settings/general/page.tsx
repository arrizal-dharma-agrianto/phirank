import { TenantGeneralSettings } from "@/modules/tenant/components/tenant-general-settings";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "General Settings",
  description: "Manage your workspace identity and general settings.",
};

export default function GeneralSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">General</h2>
        <p className="text-sm text-muted-foreground">
          Manage your tenant identity and general actions.
        </p>
      </div>

      <TenantGeneralSettings />
    </div>
  );
}
