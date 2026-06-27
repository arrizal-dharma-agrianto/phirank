import { NextResponse } from "next/server";

import { ACTIVE_TENANT_COOKIE } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/utils";
import { withAuth } from "@/lib/with-auth";

const isUniqueConstraintError = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: string }).code === "P2002";

const buildInvitationStateResponse = async (token: string, now: Date) => {
  const latestInvitation = await prisma.tenantInvitation.findUnique({
    where: { token },
    select: {
      status: true,
      expiresAt: true,
    },
  });

  if (!latestInvitation) {
    return NextResponse.json(
      { message: "Invitation not found" },
      { status: 404 },
    );
  }

  if (latestInvitation.status !== "PENDING") {
    return NextResponse.json(
      { message: `Invitation is ${latestInvitation.status.toLowerCase()}` },
      { status: 409 },
    );
  }

  if (now > latestInvitation.expiresAt) {
    await prisma.tenantInvitation.updateMany({
      where: {
        token,
        status: "PENDING",
        expiresAt: { lt: now },
      },
      data: { status: "EXPIRED" },
    });

    return NextResponse.json(
      { message: "Invitation has expired" },
      { status: 410 },
    );
  }

  return NextResponse.json(
    { message: "Invitation could not be accepted" },
    { status: 409 },
  );
};

const POST = async (
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) => {
  const { token } = await params;

  return withAuth(req, async ({ userId }) => {
    const invitation = await prisma.tenantInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      return NextResponse.json(
        { message: "Invitation not found" },
        { status: 404 },
      );
    }

    if (invitation.status !== "PENDING") {
      return NextResponse.json(
        { message: `Invitation is ${invitation.status.toLowerCase()}` },
        { status: 409 },
      );
    }

    if (new Date() > invitation.expiresAt) {
      await prisma.tenantInvitation.updateMany({
        where: {
          token,
          status: "PENDING",
        },
        data: { status: "EXPIRED" },
      });

      return NextResponse.json(
        { message: "Invitation has expired" },
        { status: 410 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    const currentUserEmail = normalizeEmail(user?.email);
    const invitedEmail = normalizeEmail(invitation.email);

    if (!currentUserEmail || currentUserEmail !== invitedEmail) {
      return NextResponse.json(
        { message: "This invitation was sent to a different email address" },
        { status: 403 },
      );
    }

    const existingMember = await prisma.tenantMember.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId: invitation.tenantId,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { message: "You are already a member of this tenant" },
        { status: 409 },
      );
    }

    const now = new Date();

    try {
      const accepted = await prisma.$transaction(async (tx) => {
        const claimResult = await tx.tenantInvitation.updateMany({
          where: {
            token,
            status: "PENDING",
            expiresAt: { gte: now },
          },
          data: {
            status: "ACCEPTED",
            acceptedAt: now,
          },
        });

        if (claimResult.count === 0) {
          return false;
        }

        await tx.tenantMember.create({
          data: {
            userId,
            tenantId: invitation.tenantId,
            roleId: invitation.roleId,
            invitedById: invitation.invitedById,
            invitedAt: invitation.createdAt,
            joinedAt: now,
          },
        });

        return true;
      });

      if (!accepted) {
        return buildInvitationStateResponse(token, now);
      }
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return NextResponse.json(
          { message: "You are already a member of this tenant" },
          { status: 409 },
        );
      }

      throw error;
    }

    const response = NextResponse.json({
      message: "Invitation accepted",
      tenantId: invitation.tenantId,
    });

    response.cookies.set({
      name: ACTIVE_TENANT_COOKIE,
      value: invitation.tenantId,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  });
};

export { POST };
