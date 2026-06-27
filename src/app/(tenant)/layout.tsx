import { DashboardLayout } from "@/modules/dashboard/components/dashboard-layout";
import { getAppName } from "@/config";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout appName={getAppName()}>{children}</DashboardLayout>;
}
