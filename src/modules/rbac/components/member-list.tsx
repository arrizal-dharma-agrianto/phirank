"use client";

import { useState } from "react";
import { TrashIcon } from "@phosphor-icons/react";

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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getPublicObjectUrl } from "@/lib/storage-url";
import { useActiveTenant, useMyTenants } from "@/modules/tenant/hooks";
import { MemberRoleSelect } from "./member-role-select";
import { useMembers } from "../hooks/use-members";
import { useDeleteMember } from "../hooks/use-delete-member";
import type { TenantMemberWithRole } from "../types";

type Props = {
  currentUserId: string;
};

const MemberList = ({ currentUserId }: Props) => {
  const { activeTenantId } = useActiveTenant();
  const { data: tenants, isLoading: isLoadingTenants } = useMyTenants();
  const { data: members, isLoading, error } = useMembers();
  const { mutate: deleteMember, isPending: isDeleting } = useDeleteMember();
  const [deletingMember, setDeletingMember] =
    useState<TenantMemberWithRole | null>(null);

  const handleDelete = () => {
    if (!deletingMember) return;

    deleteMember(deletingMember.id, {
      onSuccess: () => setDeletingMember(null),
    });
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
          <div key={i} className="flex items-center gap-3 px-4 py-3.5">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-8 w-36 rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load members. Please refresh the page.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <div className="border rounded-lg divide-y">
        {members?.map((member) => {
          const isCurrentUser = member.user.id === currentUserId;
          const initials =
            member.user.name
              ?.split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2) ?? "?";
          const imageSrc = getPublicObjectUrl(member.user.image ?? "");

          return (
            <div
              key={member.id}
              className="flex items-center gap-3 px-4 py-3.5"
            >
              {/* Avatar */}
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={imageSrc || undefined} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">
                    {member.user.name ?? "Unknown"}
                  </span>
                  {isCurrentUser && (
                    <Badge variant="secondary" className="text-xs">
                      You
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {member.user.email}
                </p>
              </div>

              {/* Role Select */}
              <MemberRoleSelect
                memberId={member.id}
                currentRoleId={member.role.id}
                disabled={!member.canUpdateRole}
              />

              {member.canRemove && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  aria-label={`Remove ${member.user.name ?? "member"}`}
                  onClick={() => setDeletingMember(member)}
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <AlertDialog
        open={!!deletingMember}
        onOpenChange={(open) => !open && setDeletingMember(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {deletingMember?.user.name ?? "this member"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This member will lose access to the current workspace. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export { MemberList };
