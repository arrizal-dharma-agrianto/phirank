"use client";

import { useState } from "react";

import { Header } from "../../../shared/components/layout/header";
import { Sidebar } from "../../../shared/components/layout/sidebar";
import { SetupProgressCard } from "./setup-progress-card";

interface DashboardShellProps {
  appName: string;
  children: React.ReactNode;
}

export function DashboardShell({ appName, children }: DashboardShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar appName={appName} isOpen={isSidebarOpen} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
        />
        <main className="relative flex-1 overflow-y-auto p-6">
          {children}
          <SetupProgressCard />
        </main>
      </div>
    </div>
  );
}
