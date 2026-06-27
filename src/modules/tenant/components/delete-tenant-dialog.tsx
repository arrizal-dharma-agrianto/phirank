"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useDeleteTenant } from "../hooks";

interface DeleteTenantDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  tenantId: string;
  tenantName: string;
}

const DeleteTenantDialog = ({
  open,
  onOpenChange,
  tenantId,
  tenantName,
}: DeleteTenantDialogProps) => {
  const [confirmText, setConfirmText] = useState("");
  const deleteTenantMutation = useDeleteTenant();

  const isConfirmed = confirmText === tenantName;

  const handleDelete = async () => {
    await deleteTenantMutation.mutateAsync(tenantId);
    setConfirmText("");
    onOpenChange(false);
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setConfirmText("");
        onOpenChange(nextOpen);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete tenant?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. Type{" "}
            <span className="font-semibold text-foreground">{tenantName}</span>{" "}
            to confirm.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid gap-2">
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={tenantName}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>

          <Button
            type="button"
            variant="destructive"
            disabled={!isConfirmed || deleteTenantMutation.isPending}
            onClick={handleDelete}
          >
            {deleteTenantMutation.isPending ? "Deleting..." : "Delete Tenant"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { DeleteTenantDialog };