"use client";

import { Skeleton } from "@/components/ui/skeleton";
import {
  CaretDownIcon,
  CheckIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { cn, initials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useActiveTenant, useMyTenants } from "../hooks";
import { useEffect, useState } from "react";
import { CreateTenantDialog } from "./create-tenant-dialog";

interface TenantSwitcherProps {
  isOpen: boolean;
}

const TenantSwitcher = ({ isOpen }: TenantSwitcherProps) => {
  const { data, isLoading } = useMyTenants();
  const { activeTenantId, setActiveTenantId } = useActiveTenant();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  useEffect(() => {
    if (!data?.length) return;

    const hasActiveTenant = data.some(
      (item) => item.tenant.id === activeTenantId,
    );

    if (!hasActiveTenant) {
      setActiveTenantId(data[0].tenant.id);
    }
  }, [activeTenantId, data, setActiveTenantId]);

  if (isLoading) return <TenantSwitcherSkeleton />;

  if (!data?.length) {
    return (
      <div className={cn("mb-4", isOpen ? "px-1" : "px-0")}>
        <Button
          type="button"
          variant="ghost"
          className={cn(
            "h-auto w-full rounded-lg py-2 text-sm font-normal text-gray-600 hover:bg-gray-50 hover:text-gray-600",
            isOpen ? "justify-start px-2" : "justify-center px-0",
          )}
          onClick={() => setIsCreateOpen(true)}
        >
          <PlusIcon className="size-4" />
          {isOpen && <span>Create Tenant</span>}
        </Button>
        <CreateTenantDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onTenantCreated={(tenant) => setActiveTenantId(tenant.tenant.id)}
        />
      </div>
    );
  }

  const activeMembership =
    data.find((item) => item.tenant.id === activeTenantId) ?? data[0];
  const activeTenant = activeMembership.tenant;

  return (
    <div className={cn("mb-4", isOpen ? "px-1" : "px-0")}>
      <DropdownMenu open={isSwitcherOpen} onOpenChange={setIsSwitcherOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            aria-label="Workspace"
            className={cn(
              "h-auto w-full rounded-lg py-2 text-sm font-normal text-gray-600 hover:bg-gray-50 hover:text-gray-600",
              isOpen ? "justify-between px-2" : "justify-center px-0",
            )}
          >
            <div
              className={cn(
                "flex items-center",
                isOpen ? "gap-2" : "justify-center",
              )}
            >
              <div className="flex h-5 w-5 items-center justify-center rounded bg-gray-200 text-[10px] font-bold text-gray-700">
                {initials(activeTenant.name)}
              </div>

              {isOpen && (
                <span className="max-w-32 truncate font-medium text-gray-800">
                  {isLoading
                    ? "Loading..."
                    : (activeTenant.name ?? "No workspace")}
                </span>
              )}
            </div>

            {isOpen && (
              <CaretDownIcon
                aria-hidden="true"
                className="size-3.5 text-gray-400"
              />
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem
            onSelect={() => {
              setIsSwitcherOpen(false);
              setIsCreateOpen(true);
            }}
          >
            <PlusIcon />
            Create Tenant
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {data.length ? (
            data.map((item) => {
              const isSelected = item.tenant.id === activeTenant.id;

              return (
                <DropdownMenuItem
                  key={item.tenant.id}
                  onSelect={() => setActiveTenantId(item.tenant.id)}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded bg-gray-200 text-[10px] font-bold text-gray-700">
                      {initials(item.tenant.name)}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {item.tenant.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.role.name}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <CheckIcon className="size-4 shrink-0 text-gray-500" />
                  )}
                </DropdownMenuItem>
              );
            })
          ) : (
            <DropdownMenuItem disabled>No tenants found</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateTenantDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onTenantCreated={(tenant) => {
          setActiveTenantId(tenant.tenant.id);
          setIsSwitcherOpen(false);
        }}
      />
    </div>
  );
};

const TenantSwitcherSkeleton = () => {
  return (
    <div className="mb-4 px-1">
      <div className="flex items-center rounded-lg py-2 gap-2 px-2">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
};

export { TenantSwitcher };
