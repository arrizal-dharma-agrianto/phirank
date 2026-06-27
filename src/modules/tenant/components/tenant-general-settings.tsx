"use client";

import { type FormEvent, useState } from "react";
import { TrashSimpleIcon } from "@phosphor-icons/react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import {
  useActiveTenant,
  useMyTenants,
  useTenantSettings,
  useUpdateTenant,
  useUpdateTenantSettings,
} from "../hooks";
import { updateTenantSchema } from "../schemas";
import { DeleteTenantDialog } from "./delete-tenant-dialog";

type TenantProfile = {
  id: string;
  name: string;
  slug: string;
};

const TenantGeneralSettings = () => {
  const { data, isLoading } = useMyTenants();
  const { activeTenantId } = useActiveTenant();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  if (isLoading) {
    return <TenantGeneralSettingsSkeleton />;
  }

  const hasMemberships = Boolean(data?.length);
  const activeMembership =
    data?.find((item) => item.tenant.id === activeTenantId) ?? null;

  if (!activeMembership) {
    return (
      <Alert>
        <AlertDescription>
          {hasMemberships
            ? "The selected workspace is no longer available. Please choose another workspace."
            : "No active workspace found."}
        </AlertDescription>
      </Alert>
    );
  }

  const { tenant, role } = activeMembership;
  const isOwner = role.slug === "owner";

  return (
    <>
      <TenantProfileCard
        key={tenant.id}
        tenant={tenant}
        isOwner={isOwner}
      />

      <SetupProgressPreferenceCard />

      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle>Danger Zone</CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            <div className="flex md:justify-between gap-4 flex-col border-t px-4 py-5 md:flex-row sm:px-6">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Delete tenant
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Permanently remove this tenant and its data.
                </p>
              </div>
              <Button
                type="button"
                variant="destructive"
                className="w-fit"
                onClick={() => setIsDeleteOpen(true)}
              >
                <TrashSimpleIcon className="size-4" />
                Delete tenant
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <DeleteTenantDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        tenantId={tenant.id}
        tenantName={tenant.name}
      />
    </>
  );
};

const SetupProgressPreferenceCard = () => {
  const { data: settings, isLoading } = useTenantSettings();
  const updateSettings = useUpdateTenantSettings();
  const isVisible = settings?.showSetupProgress ?? true;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dashboard preferences</CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        <div className="grid gap-4 border-t px-4 py-5 sm:grid-cols-[minmax(180px,1fr)_minmax(0,2fr)] sm:items-center sm:px-6">
          <div>
            <p className="text-sm font-medium text-foreground">
              Setup progress
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Show or hide the floating setup progress card on the dashboard.
            </p>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-3">
            <span className="text-sm text-gray-700">
              {isVisible ? "Visible" : "Hidden"}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isVisible}
              className={cn(
                "relative h-6 w-11 rounded-full transition disabled:cursor-not-allowed disabled:opacity-60",
                isVisible ? "bg-gray-900" : "bg-gray-200",
              )}
              disabled={isLoading || updateSettings.isPending}
              onClick={() =>
                updateSettings.mutate({
                  showSetupProgress: !isVisible,
                })
              }
            >
              <span
                className={cn(
                  "absolute top-1 size-4 rounded-full bg-white transition",
                  isVisible ? "left-6" : "left-1",
                )}
              />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

type TenantProfileCardProps = {
  tenant: TenantProfile;
  isOwner: boolean;
};

const TenantProfileCard = ({ tenant, isOwner }: TenantProfileCardProps) => {
  const updateTenantMutation = useUpdateTenant();
  const [draftName, setDraftName] = useState(tenant.name);

  const trimmedName = draftName.trim();
  const validation = updateTenantSchema.safeParse({ name: trimmedName });
  const nameError = !validation.success
    ? validation.error.issues[0]?.message
    : null;
  const isDirty = trimmedName !== tenant.name;

  const handleCancel = () => {
    setDraftName(tenant.name);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validation.success) return;

    await updateTenantMutation.mutateAsync({
      tenantId: tenant.id,
      data: validation.data,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Tenant Profile</CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <div className="grid gap-4 border-t px-4 py-5 sm:grid-cols-[minmax(180px,1fr)_minmax(0,2fr)] sm:items-start sm:px-6">
            <label
              htmlFor="tenant-name"
              className="text-sm font-medium text-foreground sm:pt-2.5"
            >
              Tenant name
            </label>
            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
                <Input
                  id="tenant-name"
                  value={draftName}
                  readOnly={!isOwner}
                  onChange={(event) => setDraftName(event.target.value)}
                  aria-invalid={Boolean(nameError)}
                  className="h-10 rounded-md px-3 text-sm md:text-sm"
                />
              </div>

              {isOwner && nameError && (
                <p className="text-xs text-destructive">{nameError}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 border-t px-4 py-5 sm:grid-cols-[minmax(180px,1fr)_minmax(0,2fr)] sm:items-center sm:px-6">
            <label
              htmlFor="tenant-slug"
              className="text-sm font-medium text-foreground"
            >
              slug
            </label>
            <div className="min-w-0">
              <Input
                id="tenant-slug"
                value={tenant.slug}
                disabled
                className="h-10 rounded-md px-3 text-sm md:text-sm"
              />
            </div>
          </div>
        </CardContent>

        {isOwner && (
          <CardFooter className="justify-end gap-2 border-t px-4 py-4 sm:px-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={updateTenantMutation.isPending || !isDirty}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                updateTenantMutation.isPending ||
                !isDirty ||
                !validation.success
              }
            >
              {updateTenantMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </CardFooter>
        )}
      </Card>
    </form>
  );
};

const TenantGeneralSettingsSkeleton = () => {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="p-0">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="grid gap-4 border-t px-4 py-5 sm:grid-cols-[minmax(180px,1fr)_minmax(0,2fr)] sm:items-center sm:px-6"
          >
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export { TenantGeneralSettings };
