"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePermissions, useRole, useUpdateRole } from "../hooks";
import { ShieldCheckIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { PermissionMatrixRow } from "./permission-matrix-row";

type Props = {
  roleId: string;
  // readonly mode untuk system role
  readonly?: boolean;
};

const PermissionMatrix = ({ roleId, readonly }: Props) => {
  const {
    data: groups,
    isLoading: loadingPerms,
    error: permsError,
  } = usePermissions();
  const {
    data: role,
    isLoading: loadingRole,
    error: roleError,
  } = useRole(roleId);
  const { mutate: updateRole, isPending } = useUpdateRole(roleId);

  // Local state untuk track perubahan sebelum di-save
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [isDirty, setIsDirty] = useState(false);

  // Sync dari data role saat pertama load atau roleId berubah
  useEffect(() => {
    if (role) {
      setCheckedIds(new Set(role.permissions.map((p) => p.id)));
      setIsDirty(false);
    }
  }, [role]);

  const handleToggle = (permissionId: string, checked: boolean) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      checked ? next.add(permissionId) : next.delete(permissionId);
      return next;
    });
    setIsDirty(true);
  };

  const handleToggleGroup = (permissionIds: string[], checked: boolean) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      permissionIds.forEach((id) => (checked ? next.add(id) : next.delete(id)));
      return next;
    });
    setIsDirty(true);
  };

  const handleReset = () => {
    if (role) {
      setCheckedIds(new Set(role.permissions.map((p) => p.id)));
      setIsDirty(false);
    }
  };

  const handleSave = () => {
    updateRole(
      { permissionIds: Array.from(checkedIds) },
      { onSuccess: () => setIsDirty(false) },
    );
  };

  // Loading state
  if (loadingPerms || loadingRole) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-muted/40 border-b">
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="divide-y">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3 px-4 py-3">
                  <Skeleton className="h-4 w-4 rounded" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (permsError || roleError) {
    return (
      <Alert variant="destructive">
        <WarningCircleIcon className="h-4 w-4" />
        <AlertDescription>
          Failed to load data. Please refresh the page.
        </AlertDescription>
      </Alert>
    );
  }

  // System role warning
  const isSystemRole = role?.isSystem ?? false;

  return (
    <div className="space-y-4">
      {/* Info banner untuk system role */}
      {isSystemRole && (
        <Alert>
          <ShieldCheckIcon className="h-4 w-4" />
          <AlertDescription>
            System role cannot have their permissions changed.
          </AlertDescription>
        </Alert>
      )}

      {/* Matrix */}
      <div className="space-y-3">
        {groups?.map((group) => (
          <PermissionMatrixRow
            key={group.group}
            group={group}
            checkedIds={checkedIds}
            disabled={readonly || isSystemRole || isPending}
            onToggle={handleToggle}
            onToggleGroup={handleToggleGroup}
          />
        ))}
      </div>

      {/* Footer actions — hanya tampil kalau bukan readonly */}
      {!readonly && !isSystemRole && (
        <div className="flex items-center justify-between pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            {checkedIds.size} Permission selected
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={!isDirty || isPending}
            >
              Reset
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!isDirty || isPending}
            >
              {isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export { PermissionMatrix };
