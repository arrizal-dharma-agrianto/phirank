import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { verifyOtpSchema } from "@/modules/auth/schemas/verify-otp.schema";
import { addMinutes } from "date-fns";
import { generateOtp, hashOtp } from "@/modules/auth/utils/otp";

const POST = async (req: Request) => {
  const body = await req.json();

  const parsed = verifyOtpSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Bad request", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { email, otp } = parsed.data;

  const token = hashOtp(email, otp);

  const verificationToken = await prisma.verificationToken.findUnique({
    where: {
      identifier_token: {
        identifier: email,
        token,
      },
    },
  });

  if (!verificationToken) {
    return NextResponse.json(
      { message: "OTP salah" },
      { status: 400 },
    );
  }

  if (verificationToken.expires < new Date()) {
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: email,
          token,
        },
      },
    });

    return NextResponse.json(
      { message: "OTP sudah expired" },
      { status: 400 },
    );
  }

  await prisma.user.update({
    where: { email },
    data: {
      emailVerified: new Date(),
    },
  });

  await prisma.verificationToken.delete({
    where: {
      identifier_token: {
        identifier: email,
        token,
      },
    },
  });

  const otpLoginToken = generateOtp();

  await prisma.verificationToken.deleteMany({
    where: {
      identifier: `otp-login:${email}`,
    },
  });

  await prisma.verificationToken.create({
    data: {
      identifier: `otp-login:${email}`,
      token: hashOtp(email, otpLoginToken),
      expires: addMinutes(new Date(), 5),
    },
  });

  return NextResponse.json({
    message: "Email verified",
    email,
    otpLoginToken,
  });
}

export { POST };