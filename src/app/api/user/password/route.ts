import { NextResponse } from "next/server";

import { hashPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { updatePasswordSchema } from "@/modules/user";

const PUT = async (req: Request) =>
  withAuth(req, async ({ userId, body }) => {
    const parsed = updatePasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Bad request",
          errors: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        passwordHash: true,
      },
    });

    if (!user?.passwordHash) {
      return NextResponse.json(
        {
          message:
            "This account uses Google authentication and has no password to change.",
        },
        { status: 400 },
      );
    }

    const isCurrentPasswordValid = await verifyPassword(
      parsed.data.currentPassword,
      user.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { message: "Current password is incorrect" },
        { status: 400 },
      );
    }

    const isSamePassword = await verifyPassword(
      parsed.data.newPassword,
      user.passwordHash,
    );

    if (isSamePassword) {
      return NextResponse.json(
        { message: "New password must be different" },
        { status: 400 },
      );
    }

    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        passwordHash: await hashPassword(parsed.data.newPassword),
      },
    });

    return NextResponse.json({
      message: "Password updated successfully",
    });
  });

export { PUT };