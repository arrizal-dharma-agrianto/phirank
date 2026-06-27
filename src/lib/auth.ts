import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";

import { prisma } from "./prisma";
import { verifyPassword } from "./password";
import { hashOtp } from "@/modules/auth";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  session: {
    strategy: "jwt",
  },

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    CredentialsProvider({
      name: "credentials",

      credentials: {
        email: {},
        password: {},
        otpLoginToken: {},
      },

      async authorize(credentials) {
        if (!credentials?.email) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) return null;

        if (credentials.otpLoginToken) {
          const tokenHash = hashOtp(user.email!, credentials.otpLoginToken);

          const loginToken = await prisma.verificationToken.findUnique({
            where: {
              identifier_token: {
                identifier: `otp-login:${user.email}`,
                token: tokenHash,
              },
            },
          });

          if (!loginToken) return null;

          if (loginToken.expires < new Date()) {
            await prisma.verificationToken.delete({
              where: {
                identifier_token: {
                  identifier: `otp-login:${user.email}`,
                  token: tokenHash,
                },
              },
            });

            return null;
          }

          await prisma.verificationToken.delete({
            where: {
              identifier_token: {
                identifier: `otp-login:${user.email}`,
                token: tokenHash,
              },
            },
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          };
        }

        if (!credentials.password) return null;

        if (!user.passwordHash) return null;

        const isValid = await verifyPassword(
          credentials.password,
          user.passwordHash,
        );

        if (!isValid) return null;

        if (!user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      }
    }),
  ],

  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
      }

      if (account?.provider === "google" && token.email) {
        await prisma.user.updateMany({
          where: {
            email: token.email,
            emailVerified: null,
          },
          data: {
            emailVerified: new Date(),
          },
        });
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }

      return session;
    },
  },

  pages: {
    signIn: "/login",
  },
};

