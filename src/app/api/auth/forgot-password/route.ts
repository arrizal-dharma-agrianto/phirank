import { addMinutes } from "date-fns";
import { NextResponse } from "next/server";

import { hashOtp, generateOtp } from "@/modules/auth";
import { forgotPasswordSchema } from "@/modules/auth/schemas/forgot-password.schema";
import { otpEmailTemplate, sendMail } from "@/modules/mail";
import { prisma } from "@/lib/prisma";

const POST = async (req: Request) => {
  const body = await req.json();
  const parsed = forgotPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Bad request", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: {
      email: parsed.data.email,
    },
  });

  if (user?.email) {
    const otp = generateOtp();
    const identifier = `forgot-password:${user.email}`;

    await prisma.verificationToken.deleteMany({
      where: {
        identifier,
      },
    });

    await prisma.verificationToken.create({
      data: {
        identifier,
        token: hashOtp(user.email, otp),
        expires: addMinutes(new Date(), 10),
      },
    });

    await sendMail({
      to: user.email,
      subject: "Reset your password",
      html: otpEmailTemplate({
        title: "Reset your password",
        description: "Use this OTP to continue resetting your password.",
        otp,
      }),
    });
  }

  return NextResponse.json({
    message: "If the email exists, an OTP has been sent.",
  });
};

export { POST };
