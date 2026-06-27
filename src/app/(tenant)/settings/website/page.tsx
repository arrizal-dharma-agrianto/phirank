import { WebsiteConfigurationSettings } from "@/modules/data-audit-crawler";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Website Settings",
  description: "Configure the workspace website used by audit and content workflows.",
};

export default function WebsiteSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Website</h2>
        <p className="text-sm text-muted-foreground">
          Configure the single website used by crawler, web audit, and content
          generation.
        </p>
      </div>

      <WebsiteConfigurationSettings />
    </div>
  );
}
