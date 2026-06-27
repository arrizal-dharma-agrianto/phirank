"use client";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import {
  createInvitationSchema,
  type CreateInvitationSchema,
} from "../schemas/invitation.schema";
import { useInviteMember } from "../hooks/use-invite-member";
import { useAssignableRoles } from "../hooks/use-roles";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const InviteMemberForm = ({ open, onOpenChange }: Props) => {
  const { mutate: inviteMember, isPending } = useInviteMember();
  const { data: roles } = useAssignableRoles();
  const roleFieldId = "invite-member-role";

  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateInvitationSchema>({
    resolver: zodResolver(createInvitationSchema),
    defaultValues: { email: "", roleId: "" },
  });

  const roleId = useWatch({ control, name: "roleId" });

  const onSubmit = (values: CreateInvitationSchema) => {
    inviteMember(values, {
      onSuccess: () => {
        onOpenChange(false);
        reset();
      },
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full p-0 sm:max-w-md">
        <SheetHeader className="border-b px-6 py-5 pr-12">
          <SheetTitle>Invite Member</SheetTitle>
          <SheetDescription>
            Send an invitation email to add a new member to this workspace.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-1 flex-col"
        >
          <div className="flex-1 px-6 py-6">
            <FieldGroup className="gap-6">
              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="email">Email Address</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@example.com"
                  className="w-full"
                  {...register("email")}
                />
                <FieldError errors={[errors.email]} />
              </Field>

              <Field data-invalid={!!errors.roleId}>
                <FieldLabel htmlFor={roleFieldId}>Role</FieldLabel>
                <Select
                  value={roleId}
                  onValueChange={(val) => setValue("roleId", val)}
                >
                  <SelectTrigger id={roleFieldId} className="w-full">
                    <SelectValue placeholder="Select a role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {roles?.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[errors.roleId]} />
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
            <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
              {isPending ? "Sending..." : "Send Invitation"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export { InviteMemberForm };
