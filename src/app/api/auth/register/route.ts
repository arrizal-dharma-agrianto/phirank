import { NextResponse } from "next/server";
import { addMinutes } from "date-fns";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { generateOtp, hashOtp, registerSchema } from "@/modules/auth";
import { otpEmailTemplate, sendMail } from "@/modules/mail";

export async function POST(req: Request) {
  const body = await req.json();

  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Bad request",
      },
      {
        status: 400,
      },
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email: parsed.data.email,
    },
  });

  if (existingUser) {
    return NextResponse.json(
      {
        message: "User already exists",
      },
      {
        status: 409,
      },
    );
  }

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: await hashPassword(
        parsed.data.password,
      ),
    },
  });

  // OTP
  const otp = generateOtp();

  await prisma.verificationToken.deleteMany({
    where: {
      identifier: user.email!,
    },
  });

  await prisma.verificationToken.create({
    data: {
      identifier: user.email!,
      token: hashOtp(user.email!, otp),
      expires: addMinutes(new Date(), 10),
    },
  });

  await sendMail({
    to: user.email!,
    subject: "Verify your email",
    html: otpEmailTemplate({
      title: "Verify your email",
      description: "Use this OTP to verify your email address.",
      otp,
    }),
  });

  return NextResponse.json(user);
}
