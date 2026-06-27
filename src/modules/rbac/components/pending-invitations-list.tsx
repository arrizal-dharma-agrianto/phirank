"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getPublicObjectUrl } from "@/lib/storage-url";
import { useActiveTenant, useMyTenants } from "@/modules/tenant/hooks";
import { useInvitations } from "../hooks/use-invitations";
import {
  useResendInvitation,
  useRevokeInvitation,
} from "../hooks/use-invite-member";

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
});

const RESEND_COOLDOWN_SECONDS = 60;

const getRemainingCooldown = (timestamp: string | number, now: number) => {
  const timestampMs =
    typeof timestamp === "number" ? timestamp : new Date(timestamp).getTime();
  const elapsedSeconds = Math.floor(
    (now - timestampMs) / 1000,
  );

  return Math.max(RESEND_COOLDOWN_SECONDS - elapsedSeconds, 0);
};

const getEmailInitials = (email: string) => {
  const [localPart = ""] = email.split("@");
  const parts = localPart.split(/[._-]/).filter(Boolean);

  if (parts.length > 1) {
    return parts
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  return localPart.slice(0, 2).toUpperCase() || "?";
};

const getDisplayInitials = (name: string | null | undefined, email: string) => {
  const nameInitials = name
    ?.split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return nameInitials || getEmailInitials(email);
};

const PendingInvitationsList = () => {
  const { activeTenantId } = useActiveTenant();
  const { data: tenants, isLoading: isLoadingTenants } = useMyTenants();
  const { data: invitations, isLoading, error } = useInvitations();
  const { mutate: revokeInvitation, isPending: isRevoking } =
    useRevokeInvitation();
  const { mutate: resendInvitation, isPending: isResending } =
    useResendInvitation();
  const [now, setNow] = useState(() => Date.now());
  const [resentAtByInvitationId, setResentAtByInvitationId] = useState<
    Record<string, number>
  >({});

  const pendingInvitations =
    invitations?.filter((invitation) => invitation.status === "PENDING") ?? [];
  const hasActiveCooldown = pendingInvitations.some((invitation) => {
    const resentAt = resentAtByInvitationId[invitation.id];

    return (
      getRemainingCooldown(invitation.updatedAt, now) > 0 ||
      (resentAt ? getRemainingCooldown(resentAt, now) > 0 : false)
    );
  });

  useEffect(() => {
    if (!hasActiveCooldown) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [hasActiveCooldown]);

  if (!isLoadingTenants && (!activeTenantId || tenants?.length === 0)) {
    return null;
  }

  if (isLoading) {
    return (
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Pending invitations</h3>
          <p className="text-xs text-muted-foreground">
            Users invited to this workspace but not yet accepted.
          </p>
        </div>
        <div className="border rounded-lg divide-y">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 px-4 py-3.5">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-44" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-8 w-24 rounded-md" />
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load pending invitations. Please refresh the page.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Pending invitations</h3>
        <p className="text-xs text-muted-foreground">
          Users invited to this workspace but not yet accepted.
        </p>
      </div>

      <div className="border rounded-lg divide-y">
        {pendingInvitations.length === 0 ? (
          <div className="px-4 py-3.5 text-sm text-muted-foreground">
            No pending invitations.
          </div>
        ) : (
          pendingInvitations.map((invitation) => {
            const resentAt = resentAtByInvitationId[invitation.id];
            const remainingCooldown = Math.max(
              getRemainingCooldown(invitation.updatedAt, now),
              resentAt ? getRemainingCooldown(resentAt, now) : 0,
            );
            const isActionDisabled = isRevoking || isResending;
            const displayName = invitation.user?.name ?? invitation.email;
            const displayEmail = invitation.user?.email ?? invitation.email;
            const initials = getDisplayInitials(
              invitation.user?.name,
              invitation.email,
            );
            const imageSrc = getPublicObjectUrl(invitation.user?.image ?? "");

            return (
              <div
                key={invitation.id}
                className="flex items-center gap-3 px-4 py-3.5"
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={imageSrc || undefined} />
                  <AvatarFallback className="text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {invitation.user ? displayName : "Unregistered"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {`${displayEmail} · `}Expires{" "}
                    {dateFormatter.format(new Date(invitation.expiresAt))}
                  </p>
                </div>
                <Badge variant="secondary">{invitation.role.name}</Badge>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isActionDisabled || remainingCooldown > 0}
                  onClick={() =>
                    resendInvitation(invitation.id, {
                      onSuccess: () => {
                        const resendTimestamp = Date.now();
                        setNow(resendTimestamp);
                        setResentAtByInvitationId((current) => ({
                          ...current,
                          [invitation.id]: resendTimestamp,
                        }));
                      },
                    })
                  }
                >
                  {remainingCooldown > 0
                    ? `Resend (${remainingCooldown}s)`
                    : "Resend"}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={isActionDisabled}
                  onClick={() => revokeInvitation(invitation.id)}
                >
                  Revoke
                </Button>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};

export { PendingInvitationsList };
