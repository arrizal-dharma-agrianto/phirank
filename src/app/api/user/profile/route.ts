import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";

import { updateProfileSchema } from "@/modules/user";
import { copyObject, deleteObject } from "@/lib/storage";

const GET = async (req: Request) =>
  withAuth(req, async ({ userId }) => {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        status: true,
        createdAt: true,
        updatedAt: true,

        accounts: {
          select: {
            provider: true,
            type: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 },
      );
    }

    const isOAuthOnly = user.accounts.some((account) => account.type === "oauth",);

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,

      isOAuthOnly,
    });
  });

const PUT = async (req: Request) =>
  withAuth(req, async ({ userId, body }) => {
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Bad request",
          errors: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { image: true },
    });


    let image = parsed.data.image;
    let tempAvatarKey: string | null = null;

    if (isTempAvatarKey(image)) {
      tempAvatarKey = image;
      const finalAvatarKey = createFinalAvatarKey(tempAvatarKey, userId);

      await copyObject({
        fromKey: tempAvatarKey,
        toKey: finalAvatarKey,
      });

      image = finalAvatarKey;
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        name: parsed.data.name,
        image,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (tempAvatarKey) {
      try {
        await deleteObject(tempAvatarKey);
      } catch (error) {
        console.error("Failed to delete temp avatar", error);
      }
    }

    if (
      isAvatarKey(currentUser?.image) &&
      currentUser?.image !== updatedUser.image
    ) {
      try {
        await deleteObject(currentUser?.image);
      } catch (error) {
        console.error("Failed to delete old avatar", error);
      }
    }

    return NextResponse.json(updatedUser);
  });

const DELETE = async (req: Request) =>
  withAuth(req, async ({ userId }) => {
    await prisma.user.delete({
      where: {
        id: userId,
      },
    });

    return NextResponse.json({
      message: "Account deleted successfully",
    });
  });

export { GET, PUT, DELETE };


const isTempAvatarKey = (key?: string | null): key is string => {
  return typeof key === "string" && key.startsWith("temp/avatar/");
};

const createFinalAvatarKey = (tempKey: string, userId: string) => {
  const fileName = tempKey.split("/").at(-1);

  return `avatar/${userId}/${fileName}`;
};

const isAvatarKey = (key?: string | null) =>
  typeof key === "string" && key.startsWith("avatar/");