"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";

import {
  createTenantSchema,
  type CreateTenantInput,
} from "../schemas";

import { useCreateTenant } from "../hooks";
import type { Tenant } from "../types";

interface CreateTenantDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  onTenantCreated?(tenant: Tenant): void;
}

const CreateTenantDialog = ({
  open,
  onOpenChange,
  onTenantCreated,
}: CreateTenantDialogProps) => {
  const createTenantMutation = useCreateTenant();

  const form = useForm<CreateTenantInput>({
    resolver: zodResolver(createTenantSchema),

    defaultValues: {
      name: "",
    },
  });

  const onSubmit = async (
    values: CreateTenantInput,
  ) => {
    try {
      const tenant = await createTenantMutation.mutateAsync(values);

      form.reset();

      onTenantCreated?.(tenant);

      onOpenChange(false);
    } catch (error) {
      form.setError("root", {
        message:
          error instanceof Error
            ? error.message
            : "Failed to create tenant",
      });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Create Tenant
          </DialogTitle>

          <DialogDescription>
            Create a new workspace.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
        >
          <Input
            placeholder="Tenant name"
            {...form.register("name")}
          />

          {form.formState.errors.name && (
            <p className="text-sm text-destructive">
              {
                form.formState.errors.name
                  .message
              }
            </p>
          )}

          {form.formState.errors.root && (
            <p className="text-sm text-destructive">
              {form.formState.errors.root.message}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={
              createTenantMutation.isPending
            }
          >
            Create Tenant
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export { CreateTenantDialog };
