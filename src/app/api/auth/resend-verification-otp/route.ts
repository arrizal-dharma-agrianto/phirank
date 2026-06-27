import { addMinutes } from "date-fns";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { generateOtp, hashOtp } from "@/modules/auth";
import { otpEmailTemplate, sendMail } from "@/modules/mail";

const resendVerificationOtpSchema = z.object({
  email: z.email("Invalid email"),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = resendVerificationOtpSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Bad request" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: {
      email: parsed.data.email,
    },
    select: {
      email: true,
      emailVerified: true,
    },
  });

  if (!user?.email) {
    return NextResponse.json(
      { message: "User not found" },
      { status: 404 },
    );
  }

  if (user.emailVerified) {
    return NextResponse.json(
      { message: "Email is already verified" },
      { status: 400 },
    );
  }

  const otp = generateOtp();

  await prisma.verificationToken.deleteMany({
    where: {
      identifier: user.email,
    },
  });

  await prisma.verificationToken.create({
    data: {
      identifier: user.email,
      token: hashOtp(user.email, otp),
      expires: addMinutes(new Date(), 10),
    },
  });

  await sendMail({
    to: user.email,
    subject: "Verify your email",
    html: otpEmailTemplate({
      title: "Verify your email",
      description: "Use this OTP to verify your email address.",
      otp,
    }),
  });

  return NextResponse.json({
    message: "OTP sent to your email",
  });
}
