"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  ClockIcon,
  ShieldCheckIcon,
  SpinnerBallIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { normalizeEmail } from "@/lib/utils";
import { useAcceptInvitation, useInvitationByToken } from "@/modules/rbac";

interface InviteClientProps {
  token: string;
}

export function InviteClient({ token }: InviteClientProps) {
  const authCallbackUrl = `/invite/${token}`;

  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const { data: invitation, isLoading, error } = useInvitationByToken(token);
  const { mutate: acceptInvitation, isPending: isAccepting } =
    useAcceptInvitation(token);

  const sessionEmail = normalizeEmail(session?.user?.email);
  const invitedEmail = normalizeEmail(invitation?.email);
  const hasEmailMismatch =
    !!session && !!invitation && sessionEmail !== invitedEmail;
  const primaryButtonLabel = isAccepting
    ? "Accepting..."
    : hasEmailMismatch
      ? "Login with invited email"
      : session
        ? "Accept Invitation"
        : "Login to Accept";

  const handleAccept = () => {
    if (!session) {
      sessionStorage.setItem("pending_invite_token", token);
      router.push(
        `/login?${new URLSearchParams({ callbackUrl: authCallbackUrl }).toString()}`,
      );
      return;
    }

    if (hasEmailMismatch) {
      return;
    }

    acceptInvitation(undefined, {
      onSuccess: () => {
        router.push("/dashboard");
        router.refresh();
      },
    });
  };

  const handleSwitchAccount = async () => {
    sessionStorage.setItem("pending_invite_token", token);
    await signOut({ redirect: false });
    router.push(
      `/login?${new URLSearchParams({ callbackUrl: authCallbackUrl }).toString()}`,
    );
  };

  useEffect(() => {
    const pendingToken = sessionStorage.getItem("pending_invite_token");
    if (session && pendingToken === token) {
      sessionStorage.removeItem("pending_invite_token");
    }
  }, [session, token]);

  if (isLoading || sessionStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SpinnerBallIcon className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-3">
              <XCircleIcon className="h-10 w-10 text-destructive" />
            </div>
            <CardTitle>Invitation Not Found</CardTitle>
            <CardDescription>
              This invitation link is invalid or no longer exists.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => router.push("/")}
            >
              Go Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (invitation.status !== "PENDING") {
    const statusConfig = {
      EXPIRED: {
        icon: ClockIcon,
        label: "Expired",
        desc: "This invitation has expired.",
      },
      REVOKED: {
        icon: XCircleIcon,
        label: "Revoked",
        desc: "This invitation has been revoked.",
      },
      ACCEPTED: {
        icon: ShieldCheckIcon,
        label: "Accepted",
        desc: "This invitation has already been accepted.",
      },
    }[invitation.status] ?? {
      icon: XCircleIcon,
      label: invitation.status,
      desc: "",
    };

    const Icon = statusConfig.icon;

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-3">
              <Icon className="h-10 w-10 text-muted-foreground" />
            </div>
            <CardTitle>Invitation {statusConfig.label}</CardTitle>
            <CardDescription>{statusConfig.desc}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => router.push("/")}
            >
              Go Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3">
            <ShieldCheckIcon className="h-10 w-10 text-primary" />
          </div>
          <CardTitle>You&apos;re Invited!</CardTitle>
          <CardDescription>
            You&apos;ve been invited to join{" "}
            <strong>{invitation.tenant.name}</strong>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm border rounded-lg px-4 py-3">
            <span className="text-muted-foreground">Workspace</span>
            <span className="font-medium">{invitation.tenant.name}</span>
          </div>
          <div className="flex items-center justify-between text-sm border rounded-lg px-4 py-3">
            <span className="text-muted-foreground">Role</span>
            <Badge variant="secondary">{invitation.role.name}</Badge>
          </div>
          <div className="flex items-center justify-between text-sm border rounded-lg px-4 py-3">
            <span className="text-muted-foreground">Invited to</span>
            <span className="font-medium">{invitation.email}</span>
          </div>

          {hasEmailMismatch && (
            <Alert variant="destructive" className="rounded-lg">
              <WarningCircleIcon className="h-4 w-4" />
              <AlertDescription>
                You are signed in as {session?.user?.email}. This invitation is
                only valid for {invitation.email}.
              </AlertDescription>
            </Alert>
          )}

          {!session && (
            <p className="text-xs text-center text-muted-foreground pt-1">
              You need to be logged in to accept this invitation. Don&apos;t
              have an account?{" "}
              <Link
                href={`/register?${new URLSearchParams({
                  callbackUrl: authCallbackUrl,
                }).toString()}`}
                className="underline underline-offset-2 hover:text-foreground"
              >
                Register first
              </Link>
            </p>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          <Button
            className="w-full"
            onClick={handleAccept}
            disabled={isAccepting || hasEmailMismatch}
          >
            {primaryButtonLabel}
          </Button>
          {hasEmailMismatch && (
            <Button
              className="w-full"
              variant="outline"
              onClick={handleSwitchAccount}
            >
              Switch Account
            </Button>
          )}
          <Button
            className="w-full"
            variant="ghost"
            onClick={() => router.push("/")}
          >
            Decline
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
