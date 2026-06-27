"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { useUpdateTenant } from "../hooks";
import { updateTenantSchema, type UpdateTenantInput } from "../schemas";

interface UpdateTenantDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  tenantId: string;
  tenantName: string;
}

const UpdateTenantDialog = ({
  open,
  onOpenChange,
  tenantId,
  tenantName,
}: UpdateTenantDialogProps) => {
  const updateTenantMutation = useUpdateTenant();

  const form = useForm<UpdateTenantInput>({
    resolver: zodResolver(updateTenantSchema),
    defaultValues: {
      name: tenantName,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: tenantName,
      });
    }
  }, [open, tenantName, form]);

  const onSubmit = async (values: UpdateTenantInput) => {
    await updateTenantMutation.mutateAsync({
      tenantId,
      data: values,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update tenant</DialogTitle>
          <DialogDescription>
            Change your workspace name.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Input placeholder="Tenant name" {...form.register("name")} />

          {form.formState.errors.name && (
            <p className="text-sm text-destructive">
              {form.formState.errors.name.message}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={
              updateTenantMutation.isPending || !form.formState.isDirty
            }
          >
            {updateTenantMutation.isPending ? "Saving..." : "Save changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export { UpdateTenantDialog };