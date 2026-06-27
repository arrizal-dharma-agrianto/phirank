import crypto from "crypto";
import { addMinutes } from "date-fns";
import { NextResponse } from "next/server";

import { hashOtp } from "@/modules/auth";
import { verifyForgotPasswordOtpSchema } from "@/modules/auth/schemas/forgot-password.schema";
import { prisma } from "@/lib/prisma";

const POST = async (req: Request) => {
  const body = await req.json();
  const parsed = verifyForgotPasswordOtpSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Bad request", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { email, otp } = parsed.data;
  const identifier = `forgot-password:${email}`;
  const token = hashOtp(email, otp);

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
      { message: "OTP is invalid" },
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
      { message: "OTP has expired" },
      { status: 400 },
    );
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetIdentifier = `reset-password:${email}`;

  await prisma.verificationToken.deleteMany({
    where: {
      identifier: resetIdentifier,
    },
  });

  await prisma.verificationToken.create({
    data: {
      identifier: resetIdentifier,
      token: hashOtp(email, resetToken),
      expires: addMinutes(new Date(), 10),
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
    email,
    resetToken,
  });
};

export { POST };
