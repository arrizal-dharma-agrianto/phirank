import { NextResponse } from "next/server";

import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { hashOtp } from "@/modules/auth";
import { resetPasswordSchema } from "@/modules/auth/schemas/forgot-password.schema";

const POST = async (req: Request) => {
  const body = await req.json();
  const parsed = resetPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Bad request", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { email, password, resetToken } = parsed.data;
  const identifier = `reset-password:${email}`;
  const token = hashOtp(email, resetToken);

  const verificationToken = await prisma.verificationToken.findUnique({
    where: {
      identifier_token: {
        identifier,
        token,
      },
    },
  });

  if (!verificationToken) {
    return NextResponse.json(
      { message: "Reset token is invalid" },
      { status: 400 },
    );
  }

  if (verificationToken.expires < new Date()) {
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier,
          token,
        },
      },
    });

    return NextResponse.json(
      { message: "Reset token has expired" },
      { status: 400 },
    );
  }

  await prisma.user.update({
    where: {
      email,
    },
    data: {
      passwordHash: await hashPassword(password),
      emailVerified: new Date(),
    },
  });

  await prisma.verificationToken.delete({
    where: {
      identifier_token: {
        identifier,
        token,
      },
    },
  });

  return NextResponse.json({
    message: "Password reset successfully",
  });
};

export { POST };
