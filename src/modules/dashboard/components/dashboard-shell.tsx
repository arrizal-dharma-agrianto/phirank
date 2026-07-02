"use client";

import { PlusIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateTenantDialog } from "@/modules/tenant/components/create-tenant-dialog";
import { useActiveTenant, useMyTenants } from "@/modules/tenant/hooks";
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
          <TenantContextGate>{children}</TenantContextGate>
        </main>
      </div>
    </div>
  );
}

function TenantContextGate({ children }: { children: React.ReactNode }) {
  const { data: tenants, isLoading } = useMyTenants();
  const { activeTenantId, setActiveTenantId } = useActiveTenant();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const hasTenants = Boolean(tenants?.length);
  const hasValidActiveTenant = Boolean(
    activeTenantId &&
      tenants?.some((membership) => membership.tenant.id === activeTenantId),
  );

  useEffect(() => {
    if (!tenants?.length || hasValidActiveTenant) return;

    setActiveTenantId(tenants[0].tenant.id);
  }, [hasValidActiveTenant, tenants, setActiveTenantId]);

  if (isLoading) {
    return (
      <div className="mx-auto grid w-full max-w-6xl gap-5">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-72 rounded-lg" />
      </div>
    );
  }

  if (!hasTenants) {
    return (
      <div className="mx-auto grid w-full max-w-3xl gap-5">
        <div className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
                Workspace
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-gray-950">
                Create your first tenant
              </h2>
              <p className="mt-2 max-w-xl text-sm text-gray-500">
                A tenant is required before loading dashboard, website, and
                workspace settings.
              </p>
            </div>
            <Button
              type="button"
              className="w-full rounded-lg bg-gray-900 text-white hover:bg-gray-800 sm:w-fit"
              onClick={() => setIsCreateOpen(true)}
            >
              <PlusIcon aria-hidden="true" className="size-3.5" />
              Create Tenant
            </Button>
          </div>
        </div>
        <CreateTenantDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onTenantCreated={(tenant) => setActiveTenantId(tenant.tenant.id)}
        />
      </div>
    );
  }

  if (!hasValidActiveTenant) {
    return (
      <div className="mx-auto grid w-full max-w-6xl gap-5">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-72 rounded-lg" />
      </div>
    );
  }

  return (
    <>
      {children}
      <SetupProgressCard />
    </>
  );
}
