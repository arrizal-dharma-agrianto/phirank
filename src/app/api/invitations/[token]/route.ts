import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

const GET = async (
  _: Request,
  { params }: { params: Promise<{ token: string }> },
) => {
  const { token } = await params;

  const invitation = await prisma.tenantInvitation.findUnique({
    where: { token },
    select: {
      id: true,
      email: true,
      status: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
      role: { select: { id: true, name: true, slug: true } },
      tenant: { select: { id: true, name: true, slug: true } },
      invitedById: true,
    },
  });

  if (!invitation) {
    return NextResponse.json(
      { message: "Invitation not found" },
      { status: 404 },
    );
  }

  if (invitation.status === "PENDING" && new Date() > invitation.expiresAt) {
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

  return NextResponse.json(invitation);
};

export { GET };
