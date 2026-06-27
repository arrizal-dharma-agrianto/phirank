import { NextResponse } from "next/server";

import { getAuthorizationContext, hasPermission } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { sendMail } from "@/modules/mail/services";
import { invitationTemplate } from "@/modules/mail/templates/invitation.template";

const RESEND_COOLDOWN_SECONDS = 60;

const POST = async (
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) => {
  const { token: invitationRef } = await params;

  return withAuth(req, async ({ userId }) => {
    const authorization = await getAuthorizationContext(userId);
    if (!authorization) {
      return NextResponse.json(
        { message: "Tenant context not found" },
        { status: 403 },
      );
    }

    if (!hasPermission(authorization, "members.invite")) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const invitation = await prisma.tenantInvitation.findUnique({
      where: { token: invitationRef },
      select: {
        id: true,
        tenantId: true,
        email: true,
        status: true,
        token: true,
        expiresAt: true,
        updatedAt: true,
        role: { select: { name: true } },
      },
    }) ??
      (await prisma.tenantInvitation.findUnique({
        where: { id: invitationRef },
        select: {
          id: true,
          tenantId: true,
          email: true,
          status: true,
          token: true,
          expiresAt: true,
          updatedAt: true,
          role: { select: { name: true } },
        },
      }));

    if (!invitation || invitation.tenantId !== authorization.tenantId) {
      return NextResponse.json(
        { message: "Invitation not found" },
        { status: 404 },
      );
    }

    if (invitation.status !== "PENDING") {
      return NextResponse.json(
        { message: "Only pending invitations can be resent" },
        { status: 409 },
      );
    }

    const now = new Date();
    if (now > invitation.expiresAt) {
      await prisma.tenantInvitation.updateMany({
        where: {
          id: invitation.id,
          status: "PENDING",
        },
        data: { status: "EXPIRED" },
      });

      return NextResponse.json(
        { message: "Invitation has expired" },
        { status: 409 },
      );
    }

    const elapsedSeconds = Math.floor(
      (now.getTime() - invitation.updatedAt.getTime()) / 1000,
    );
    const remainingSeconds = RESEND_COOLDOWN_SECONDS - elapsedSeconds;

    if (remainingSeconds > 0) {
      return NextResponse.json(
        {
          message: `Please wait ${remainingSeconds} seconds before resending this invitation.`,
        },
        { status: 429 },
      );
    }

    const inviter = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
    const inviteUrl = `${process.env.NEXTAUTH_URL}/invite/${invitation.token}`;

    try {
      await sendMail({
        to: invitation.email,
        subject: `You're invited to join ${authorization.tenantName}`,
        html: invitationTemplate({
          inviterName: inviter?.name ?? inviter?.email ?? "Someone",
          tenantName: authorization.tenantName,
          roleName: invitation.role.name,
          inviteUrl,
          expiresInDays: Math.max(
            1,
            Math.ceil(
              (invitation.expiresAt.getTime() - now.getTime()) /
                (1000 * 60 * 60 * 24),
            ),
          ),
        }),
      });
    } catch (error) {
      console.error("Failed to resend invitation email", error);

      return NextResponse.json(
        { message: "Failed to resend invitation email. Please try again." },
        { status: 502 },
      );
    }

    await prisma.tenantInvitation.update({
      where: { id: invitation.id },
      data: { updatedAt: now },
    });

    return NextResponse.json({ message: "Invitation resent" });
  });
};

export { POST };
