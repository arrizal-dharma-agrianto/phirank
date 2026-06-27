import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { hashOtp } from "@/modules/auth";

import {
  currentEmailTokenIdentifier,
  newEmailLinkIdentifier,
} from "../_utils";

const getAccountRedirectUrl = (
  req: Request,
  status: "success" | "error",
  message: string,
) => {
  const url = new URL("/account", req.url);
  url.searchParams.set("emailUpdate", status);
  url.searchParams.set("message", message);

  return url;
};

const getLoginRedirectUrl = (req: Request) => {
  const url = new URL("/login", req.url);
  url.searchParams.set("callbackUrl", req.url);

  return url;
};

const GET = async (req: Request) => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.redirect(getLoginRedirectUrl(req));
  }

  const userId = session.user.id;

  const url = new URL(req.url);
  const newEmail = url.searchParams.get("email");
  const token = url.searchParams.get("token");

  if (!newEmail || !token) {
    return NextResponse.redirect(
      getAccountRedirectUrl(req, "error", "Verification link is invalid"),
    );
  }

  const identifier = newEmailLinkIdentifier(userId, newEmail);
  const hashedToken = hashOtp(newEmail, token);

  const verificationToken = await prisma.verificationToken.findUnique({
    where: {
      identifier_token: {
        identifier,
        token: hashedToken,
      },
    },
  });

  if (!verificationToken) {
    return NextResponse.redirect(
      getAccountRedirectUrl(req, "error", "Verification link is invalid"),
    );
  }

  if (verificationToken.expires < new Date()) {
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier,
          token: hashedToken,
        },
      },
    });

    return NextResponse.redirect(
      getAccountRedirectUrl(req, "error", "Verification link has expired"),
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email: newEmail,
    },
    select: {
      id: true,
    },
  });

  if (existingUser && existingUser.id !== userId) {
    return NextResponse.redirect(
      getAccountRedirectUrl(req, "error", "Email is already used"),
    );
  }

  try {
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        email: newEmail,
        emailVerified: new Date(),
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.redirect(
        getAccountRedirectUrl(req, "error", "Email is already used"),
      );
    }

    throw error;
  }

  await prisma.verificationToken.deleteMany({
    where: {
      OR: [
        {
          identifier: currentEmailTokenIdentifier(userId),
        },
        {
          identifier,
          token: hashedToken,
        },
      ],
    },
  });

  return NextResponse.redirect(
    getAccountRedirectUrl(req, "success", "Email updated successfully"),
  );
};

export { GET };
