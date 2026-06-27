import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { sendNewEmailLinkSchema } from "@/modules/user";

import {
  createEmailLinkToken,
  getNewEmailVerificationUrl,
  newEmailLinkIdentifier,
  sendNewEmailVerificationLink,
  verifyCurrentEmailToken,
} from "../_utils";

const POST = async (req: Request) =>
  withAuth(req, async ({ userId, body }) => {
    const parsed = sendNewEmailLinkSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Bad request",
          errors: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const tokenError = await verifyCurrentEmailToken(
      userId,
      parsed.data.currentEmailToken,
    );

    if (tokenError) return tokenError;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
      },
    });

    if (user?.email === parsed.data.newEmail) {
      return NextResponse.json(
        { message: "New email must be different" },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email: parsed.data.newEmail,
      },
      select: {
        id: true,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Email is already used" },
        { status: 409 },
      );
    }

    const token = await createEmailLinkToken({
      identifier: newEmailLinkIdentifier(userId, parsed.data.newEmail),
      email: parsed.data.newEmail,
    });

    await sendNewEmailVerificationLink({
      to: parsed.data.newEmail,
      verifyUrl: getNewEmailVerificationUrl({
        newEmail: parsed.data.newEmail,
        token,
      }),
    });

    return NextResponse.json({
      message: "Verification link sent to new email",
    });
  });

export { POST };
