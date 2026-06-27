import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";

type AuthenticatedHandler<T = unknown> = (context: {
  session: Awaited<ReturnType<typeof getServerSession>>;
  userId: string;
  body?: T;
}) => Promise<Response>;

export async function withAuth<T>(
  req: Request,
  handler: AuthenticatedHandler<T>,
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 },
    );
  }

  let body: T | undefined;

  try {
    body = await req.json();
  } catch {
    body = undefined;
  }

  return handler({
    session,
    userId: session.user.id,
    body,
  });
}