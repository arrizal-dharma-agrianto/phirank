import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";

import {
  createOtpToken,
  currentEmailOtpIdentifier,
  currentEmailTokenIdentifier,
  sendOtpEmail,
} from "../_utils";

const POST = async (req: Request) =>
  withAuth(req, async ({ userId }) => {
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

    await prisma.verificationToken.deleteMany({
      where: {
        identifier: currentEmailTokenIdentifier(userId),
      },
    });

    const otp = await createOtpToken({
      identifier: currentEmailOtpIdentifier(userId),
      email: user.email,
    });

    await sendOtpEmail({
      to: user.email,
      subject: "Verify current email",
      title: "Current email verification OTP",
      otp,
    });

    return NextResponse.json({
      message: "OTP sent to current email",
    });
  });

export { POST };
