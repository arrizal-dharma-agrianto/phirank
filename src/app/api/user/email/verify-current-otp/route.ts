import crypto from "crypto";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { hashOtp } from "@/modules/auth";
import { verifyCurrentEmailOtpSchema } from "@/modules/user";

import {
  currentEmailOtpIdentifier,
  currentEmailTokenIdentifier,
  getExpiresAt,
  verifyOtpToken,
} from "../_utils";

const POST = async (req: Request) =>
  withAuth(req, async ({ userId, body }) => {
    const parsed = verifyCurrentEmailOtpSchema.safeParse(body);

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
      where: { id: userId },
      select: {
        email: true,
      },
    });

    if (!user?.email) {
      return NextResponse.json(
        { message: "Current email not found" },
        { status: 400 },
      );
    }

    const otpError = await verifyOtpToken({
      identifier: currentEmailOtpIdentifier(userId),
      email: user.email,
      otp: parsed.data.otp,
    });

    if (otpError) return otpError;

    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: currentEmailOtpIdentifier(userId),
          token: hashOtp(user.email, parsed.data.otp),
        },
      },
    });

    const currentEmailToken = crypto.randomUUID();

    await prisma.verificationToken.deleteMany({
      where: {
        identifier: currentEmailTokenIdentifier(userId),
      },
    });

    await prisma.verificationToken.create({
      data: {
        identifier: currentEmailTokenIdentifier(userId),
        token: hashOtp(userId, currentEmailToken),
        expires: getExpiresAt(),
      },
    });

    return NextResponse.json({
      currentEmailToken,
    });
  });

export { POST };
