import crypto from "crypto";
import { NextResponse } from "next/server";

import {
  escapeHtml,
  mailLayoutTemplate,
  otpEmailTemplate,
  sendMail,
} from "@/modules/mail";
import { generateOtp, hashOtp } from "@/modules/auth";
import { prisma } from "@/lib/prisma";

const EMAIL_UPDATE_TOKEN_TTL_MS = 10 * 60 * 1000;

const getExpiresAt = () =>
  new Date(Date.now() + EMAIL_UPDATE_TOKEN_TTL_MS);

const currentEmailOtpIdentifier = (userId: string) =>
  `update-email:current:${userId}`;

const currentEmailTokenIdentifier = (userId: string) =>
  `update-email:current-token:${userId}`;

const newEmailLinkIdentifier = (
  userId: string,
  newEmail: string,
) => `update-email:new-link:${userId}:${newEmail}`;

const getAppUrl = () => {
  return process.env.NEXTAUTH_URL ?? "http://localhost:3000";
};

const sendOtpEmail = async (params: {
  to: string;
  subject: string;
  title: string;
  otp: string;
}) => {
  await sendMail({
    to: params.to,
    subject: params.subject,
    html: otpEmailTemplate({
      title: params.title,
      description: "Use this OTP to continue updating your email.",
      otp: params.otp,
    }),
  });
};

const sendNewEmailVerificationLink = async (params: {
  to: string;
  verifyUrl: string;
}) => {
  const safeVerifyUrl = escapeHtml(params.verifyUrl);

  await sendMail({
    to: params.to,
    subject: "Verify new email",
    html: mailLayoutTemplate({
      title: "Verify your new email",
      previewText: "Confirm this email address to finish updating your account.",
      children: `
        <p style="margin:0 0 16px;font-size:14px;line-height:22px;color:#334155;">
          Click the button below to confirm this email address and finish updating your account email.
        </p>
        <a href="${safeVerifyUrl}" style="display:inline-block;background:#020617;color:#ffffff;text-decoration:none;border-radius:6px;padding:10px 14px;font-size:13px;font-weight:600;">
          Verify New Email
        </a>
      `,
    }),
  });
};

const createOtpToken = async (params: {
  identifier: string;
  email: string;
}) => {
  const otp = generateOtp();

  await prisma.verificationToken.deleteMany({
    where: {
      identifier: params.identifier,
    },
  });

  await prisma.verificationToken.create({
    data: {
      identifier: params.identifier,
      token: hashOtp(params.email, otp),
      expires: getExpiresAt(),
    },
  });

  return otp;
};

const createEmailLinkToken = async (params: {
  identifier: string;
  email: string;
}) => {
  const token = crypto.randomUUID();

  await prisma.verificationToken.deleteMany({
    where: {
      identifier: params.identifier,
    },
  });

  await prisma.verificationToken.create({
    data: {
      identifier: params.identifier,
      token: hashOtp(params.email, token),
      expires: getExpiresAt(),
    },
  });

  return token;
};

const getNewEmailVerificationUrl = (params: {
  newEmail: string;
  token: string;
}) => {
  const verifyUrl = new URL("/api/user/email/confirm-new-link", getAppUrl());
  verifyUrl.searchParams.set("email", params.newEmail);
  verifyUrl.searchParams.set("token", params.token);

  return verifyUrl.toString();
};

const verifyOtpToken = async (params: {
  identifier: string;
  email: string;
  otp: string;
}) => {
  const token = hashOtp(params.email, params.otp);

  const verificationToken = await prisma.verificationToken.findUnique({
    where: {
      identifier_token: {
        identifier: params.identifier,
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
          identifier: params.identifier,
          token,
        },
      },
    });

    return NextResponse.json(
      { message: "OTP has expired" },
      { status: 400 },
    );
  }

  return null;
};

const getCurrentEmailToken = async (
  userId: string,
  currentEmailToken: string,
) => {
  return prisma.verificationToken.findUnique({
    where: {
      identifier_token: {
        identifier: currentEmailTokenIdentifier(userId),
        token: hashOtp(userId, currentEmailToken),
      },
    },
  });
};

const verifyCurrentEmailToken = async (
  userId: string,
  currentEmailToken: string,
) => {
  const token = await getCurrentEmailToken(userId, currentEmailToken);

  if (!token) {
    return NextResponse.json(
      { message: "Current email verification is required" },
      { status: 400 },
    );
  }

  if (token.expires < new Date()) {
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: currentEmailTokenIdentifier(userId),
          token: hashOtp(userId, currentEmailToken),
        },
      },
    });

    return NextResponse.json(
      { message: "Current email verification has expired" },
      { status: 400 },
    );
  }

  return null;
};

export {
  getExpiresAt,
  currentEmailOtpIdentifier,
  currentEmailTokenIdentifier,
  newEmailLinkIdentifier,
  sendOtpEmail,
  sendNewEmailVerificationLink,
  createOtpToken,
  createEmailLinkToken,
  getNewEmailVerificationUrl,
  verifyOtpToken,
  verifyCurrentEmailToken,
};
