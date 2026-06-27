import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

import { Prisma } from "@/app/generated/prisma/client";
import { getAuthorizationContext, hasPermission } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { canManageRole } from "@/lib/rbac-role-access";
import { normalizeEmail } from "@/lib/utils";
import { withAuth } from "@/lib/with-auth";
import { sendMail } from "@/modules/mail/services";
import { invitationTemplate } from "@/modules/mail/templates/invitation.template";
import { createInvitationSchema } from "@/modules/rbac/schemas/invitation.schema";

const INVITE_EXPIRES_DAYS = 7;
const MAX_CREATE_INVITATION_ATTEMPTS = 3;

class ConcurrentInvitationError extends Error {}

const invitationSelect = {
  id: true,
  email: true,
  status: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
  role: { select: { id: true, name: true, slug: true } },
  tenant: { select: { id: true, name: true, slug: true } },
} as const;

const isPrismaErrorCode = (error: unknown, code: string) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: string }).code === code;

const createPendingInvitation = async (params: {
  email: string;
  roleId: string;
  tenantId: string;
  userId: string;
}) => {
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRES_DAYS);

  for (
    let attempt = 1;
    attempt <= MAX_CREATE_INVITATION_ATTEMPTS;
    attempt += 1
  ) {
    const token = randomBytes(32).toString("hex");

    try {
      return await prisma.$transaction(
        async (tx) => {
          await tx.tenantInvitation.updateMany({
            where: {
              tenantId: params.tenantId,
              email: params.email,
              status: "PENDING",
              expiresAt: { lt: now },
            },
            data: { status: "EXPIRED" },
          });

          const existingMember = await tx.tenantMember.findFirst({
            where: {
              tenantId: params.tenantId,
              user: { email: params.email },
            },
          });

          if (existingMember) {
            return { kind: "member_exists" } as const;
          }

          const existingInvitation = await tx.tenantInvitation.findFirst({
            where: {
              tenantId: params.tenantId,
              email: params.email,
              status: "PENDING",
              expiresAt: { gte: now },
            },
          });

          if (existingInvitation) {
            return { kind: "pending_exists" } as const;
          }

          const invitation = await tx.tenantInvitation.create({
            data: {
              tenantId: params.tenantId,
              roleId: params.roleId,
              email: params.email,
              token,
              expiresAt,
              invitedById: params.userId,
              status: "PENDING",
            },
            select: invitationSelect,
          });

          return {
            kind: "created",
            invitation,
            token,
          } as const;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      if (
        isPrismaErrorCode(error, "P2034") &&
        attempt < MAX_CREATE_INVITATION_ATTEMPTS
      ) {
        continue;
      }

      if (isPrismaErrorCode(error, "P2034")) {
        throw new ConcurrentInvitationError();
      }

      throw error;
    }
  }

  throw new ConcurrentInvitationError();
};

const GET = async (req: Request) =>
  withAuth(req, async ({ userId }) => {
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

    await prisma.tenantInvitation.updateMany({
      where: {
        tenantId: authorization.tenantId,
        status: "PENDING",
        expiresAt: { lt: new Date() },
      },
      data: { status: "EXPIRED" },
    });

    const invitations = await prisma.tenantInvitation.findMany({
      where: {
        tenantId: authorization.tenantId,
      },
      select: invitationSelect,
      orderBy: { createdAt: "desc" },
    });

    const invitedUsers = await prisma.user.findMany({
      where: {
        email: {
          in: invitations.map((invitation) => invitation.email),
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });
    const userByEmail = new Map(
      invitedUsers
        .filter((user) => user.email)
        .map((user) => [normalizeEmail(user.email), user]),
    );

    return NextResponse.json(
      invitations.map((invitation) => ({
        ...invitation,
        user: userByEmail.get(normalizeEmail(invitation.email)) ?? null,
      })),
    );
  });

const POST = async (req: Request) =>
  withAuth(req, async ({ userId, body }) => {
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

    const parsed = createInvitationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Bad request" },
        { status: 400 },
      );
    }

    const { roleId } = parsed.data;
    const email = normalizeEmail(parsed.data.email);

    const role = await prisma.role.findFirst({
      where: {
        id: roleId,
        OR: [
          { tenantId: authorization.tenantId },
          { tenantId: null, isSystem: true },
        ],
      },
      include: {
        permissions: {
          select: {
            permission: {
              select: { key: true },
            },
          },
        },
      },
    });

    if (!role) {
      return NextResponse.json({ message: "Role not found" }, { status: 404 });
    }

    if (!canManageRole(authorization, role)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const inviter = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    let createResult: Awaited<ReturnType<typeof createPendingInvitation>>;

    try {
      createResult = await createPendingInvitation({
        email,
        roleId,
        tenantId: authorization.tenantId,
        userId,
      });
    } catch (error) {
      if (error instanceof ConcurrentInvitationError) {
        return NextResponse.json(
          { message: "Concurrent invitation request detected. Please try again." },
          { status: 409 },
        );
      }

      throw error;
    }

    if (createResult.kind === "member_exists") {
      return NextResponse.json(
        { message: "User is already a member of this tenant" },
        { status: 409 },
      );
    }

    if (createResult.kind === "pending_exists") {
      return NextResponse.json(
        { message: "An invitation has already been sent to this email" },
        { status: 409 },
      );
    }

    const { invitation, token } = createResult;
    const inviteUrl = `${process.env.NEXTAUTH_URL}/invite/${token}`;

    try {
      await sendMail({
        to: email,
        subject: `You're invited to join ${authorization.tenantName}`,
        html: invitationTemplate({
          inviterName: inviter?.name ?? inviter?.email ?? "Someone",
          tenantName: authorization.tenantName,
          roleName: role.name,
          inviteUrl,
          expiresInDays: INVITE_EXPIRES_DAYS,
        }),
      });
    } catch (error) {
      await prisma.tenantInvitation.updateMany({
        where: {
          id: invitation.id,
          status: "PENDING",
        },
        data: { status: "REVOKED" },
      });

      console.error("Failed to send invitation email", error);

      return NextResponse.json(
        { message: "Failed to send invitation email. Please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json(invitation);
  });

export { GET, POST };
