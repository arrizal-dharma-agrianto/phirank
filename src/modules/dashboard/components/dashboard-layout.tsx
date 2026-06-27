import { DashboardShell } from "./dashboard-shell";

interface DashboardLayoutProps {
  appName: string;
  children: React.ReactNode;
}

export function DashboardLayout({ appName, children }: DashboardLayoutProps) {
  return <DashboardShell appName={appName}>{children}</DashboardShell>;
}
