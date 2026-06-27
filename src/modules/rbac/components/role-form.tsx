"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import {
  createRoleSchema,
  type CreateRoleOutput,
  type CreateRoleSchema,
} from "../schemas/role.schema";
import { useCreateRole } from "../hooks/use-create-role";
import { useUpdateRole } from "../hooks/use-update-role";
import type { RoleWithPermissions } from "../types/role.types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: RoleWithPermissions | null;
};

const RoleForm = ({ open, onOpenChange, role }: Props) => {
  const isEdit = !!role;
  const { mutate: createRole, isPending: isCreating } = useCreateRole();
  const { mutate: updateRole, isPending: isUpdating } = useUpdateRole(
    role?.id ?? "",
  );
  const isPending = isCreating || isUpdating;

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateRoleSchema, unknown, CreateRoleOutput>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      permissionIds: [],
    },
  });

  useEffect(() => {
    if (role) {
      reset({
        name: role.name,
        slug: role.slug,
        description: role.description ?? "",
        permissionIds: role.permissions.map((p) => p.id),
      });
    } else {
      reset({ name: "", slug: "", description: "", permissionIds: [] });
    }
  }, [role, reset]);

  const handleNameChange = (value: string) => {
    setValue("name", value);
    if (!isEdit) {
      setValue(
        "slug",
        value
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, ""),
      );
    }
  };

  const onSubmit = (values: CreateRoleOutput) => {
    if (isEdit) {
      updateRole(values, { onSuccess: () => onOpenChange(false) });
    } else {
      createRole(values, {
        onSuccess: () => {
          onOpenChange(false);
          reset();
        },
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full p-0 sm:max-w-md">
        <SheetHeader className="border-b px-6 py-5 pr-12">
          <SheetTitle>{isEdit ? "Edit Role" : "Create New Role"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Change the role's name and description. Permissions are configured on the details page."
              : "Create a new role to manage member access rights."}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-1 flex-col"
        >
          <div className="flex-1 px-6 py-6">
            <FieldGroup className="gap-6">
              {/* Name */}
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="name">Role Name</FieldLabel>
                <Input
                  id="name"
                  placeholder="example: Editor"
                  className="w-full"
                  {...register("name")}
                  onChange={(e) => handleNameChange(e.target.value)}
                />
                <FieldError errors={[errors.name]} />
              </Field>

              {/* Slug */}
              <Field data-invalid={!!errors.slug}>
                <FieldLabel htmlFor="slug">Slug</FieldLabel>
                <Input
                  id="slug"
                  placeholder="example: editor"
                  className="w-full font-mono text-sm"
                  disabled={isEdit}
                  {...register("slug")}
                />
                <FieldError errors={[errors.slug]} />
              </Field>

              {/* Description */}
              <Field data-invalid={!!errors.description}>
                <FieldLabel htmlFor="description">
                  Description{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </FieldLabel>
                <Textarea
                  id="description"
                  placeholder="Explain the function of this role..."
                  className="min-h-28 w-full resize-none"
                  rows={4}
                  {...register("description")}
                />
                <FieldError errors={[errors.description]} />
              </Field>
            </FieldGroup>
          </div>

          <SheetFooter className="border-t bg-muted/20 px-6 py-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="w-full sm:w-auto"
            >
              {isPending ? "Saving..." : isEdit ? "Save" : "Create Role"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export { RoleForm };
