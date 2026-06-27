"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRoles } from "../hooks/use-roles";
import { useDeleteRole } from "../hooks/use-delete-role";
import { useActiveTenant, useMyTenants } from "@/modules/tenant/hooks";
import { RoleForm } from "./role-form";
import type { RoleWithPermissions } from "../types/role.types";
import {
  PencilIcon,
  PlusIcon,
  ShieldCheckIcon,
  TagChevronIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const RoleList = () => {
  const router = useRouter();
  const { activeTenantId } = useActiveTenant();
  const { data: tenants, isLoading: isLoadingTenants } = useMyTenants();

  const { data: roles, isLoading, error } = useRoles();
  const { mutate: deleteRole, isPending: isDeleting } = useDeleteRole();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleWithPermissions | null>(
    null,
  );
  const [deletingRole, setDeletingRole] = useState<RoleWithPermissions | null>(
    null,
  );

  const handleEdit = (role: RoleWithPermissions) => {
    setEditingRole(role);
    setSheetOpen(true);
  };

  const handleCreate = () => {
    setEditingRole(null);
    setSheetOpen(true);
  };

  const handleDelete = () => {
    if (!deletingRole) return;
    deleteRole(deletingRole.id, {
      onSuccess: () => setDeletingRole(null),
    });
  };

  const handleClickRow = (roleId: string) => {
    router.push(`/settings/roles/${roleId}`);
  };

  if (!isLoadingTenants && (!activeTenantId || tenants?.length === 0)) {
    return (
      <Alert>
        <AlertDescription>No active workspace found.</AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="border rounded-lg divide-y">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load roles. Please refresh the page.
        </AlertDescription>
      </Alert>
    );
  }

  const systemRoles = roles?.filter((r) => r.isSystem) ?? [];
  const customRoles = roles?.filter((r) => !r.isSystem) ?? [];

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {roles?.length ?? 0} roles available
          </p>
          <Button size="sm" onClick={handleCreate}>
            <PlusIcon className="h-4 w-4 mr-1.5" />
            Create Role
          </Button>
        </div>

        {/* System Roles */}
        {systemRoles.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              System Roles
            </p>
            <div className="border rounded-lg divide-y">
              {systemRoles.map((role) => (
                <RoleRow
                  key={role.id}
                  role={role}
                  onEdit={handleEdit}
                  onDelete={setDeletingRole}
                  onClick={handleClickRow}
                />
              ))}
            </div>
          </div>
        )}

        {/* Custom Roles */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Custom Roles
          </p>
          {customRoles.length === 0 ? (
            <div className="border rounded-lg px-4 py-8 text-center">
              <ShieldCheckIcon className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                There are no custom roles yet.{" "}
                <button
                  onClick={handleCreate}
                  className="underline underline-offset-2 hover:text-foreground transition-colors"
                >
                  Create one now
                </button>
              </p>
            </div>
          ) : (
            <div className="border rounded-lg divide-y">
              {customRoles.map((role) => (
                <RoleRow
                  key={role.id}
                  role={role}
                  onEdit={handleEdit}
                  onDelete={setDeletingRole}
                  onClick={handleClickRow}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sheet Form */}
      <RoleForm
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        role={editingRole}
      />

      {/* Delete Confirm Dialog */}
      <AlertDialog
        open={!!deletingRole}
        onOpenChange={(open) => !open && setDeletingRole(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete role "{deletingRole?.name}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Members with this role will lose the associated permissions. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// Sub-komponen row agar RoleList tidak terlalu panjang
type RoleRowProps = {
  role: RoleWithPermissions;
  onEdit: (role: RoleWithPermissions) => void;
  onDelete: (role: RoleWithPermissions) => void;
  onClick: (roleId: string) => void;
};

type RoleActionButtonProps = {
  label: string;
  disabled?: boolean;
  hint?: string;
  className?: string;
  icon: ReactNode;
  onClick: () => void;
};

const RoleActionButton = ({
  label,
  disabled = false,
  hint,
  className,
  icon,
  onClick,
}: RoleActionButtonProps) => {
  const tooltip = hint ?? label;

  return (
    <span title={tooltip} className="inline-flex">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={className}
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
      >
        {icon}
      </Button>
    </span>
  );
};

const RoleRow = ({ role, onEdit, onDelete, onClick }: RoleRowProps) => {
  const editDisabled = role.isSystem;
  const deleteDisabled = role.isSystem || role.isDefault;

  const editHint = role.isSystem
    ? "System roles cannot be edited"
    : "Edit role";

  const deleteHint = role.isSystem
    ? "System roles cannot be deleted"
    : role.isDefault
      ? "Default roles cannot be deleted"
      : "Delete role";

  return (
    <div
      className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors group cursor-pointer"
      onClick={() => onClick(role.id)}
    >
      {/* Icon */}
      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-muted flex items-center justify-center">
        {role.isSystem ? (
          <ShieldCheckIcon className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ShieldCheckIcon className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{role.name}</span>
          {role.isDefault && (
            <Badge variant="secondary" className="text-xs">
              Default
            </Badge>
          )}
          {role.isSystem && (
            <Badge variant="outline" className="text-xs">
              System
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {role.permissions.length} permission
          {role.description && <> · {role.description}</>}
        </p>
      </div>

      {/* Actions */}
      <div
        className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <RoleActionButton
          label="Edit role"
          disabled={editDisabled}
          hint={editHint}
          className="h-7 w-7"
          icon={<PencilIcon className="h-3.5 w-3.5" />}
          onClick={() => onEdit(role)}
        />
        <RoleActionButton
          label="Delete role"
          disabled={deleteDisabled}
          hint={deleteHint}
          className="h-7 w-7 text-destructive hover:text-destructive"
          icon={<TrashIcon className="h-3.5 w-3.5" />}
          onClick={() => onDelete(role)}
        />
        <TagChevronIcon className="h-4 w-4 text-muted-foreground ml-1" />
      </div>
    </div>
  );
};

export { RoleList };
