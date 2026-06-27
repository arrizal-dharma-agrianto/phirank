import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { getAuthorizationContext, hasPermission } from "@/lib/authorization";

const GET = async (req: Request) =>
  withAuth(req, async ({ userId }) => {
    const authorization = await getAuthorizationContext(userId);

    if (!authorization) {
      return NextResponse.json(
        { message: "Tenant context not found" },
        { status: 403 },
      );
    }

    if (!hasPermission(authorization, "roles.read")) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const permissions = await prisma.permission.findMany({
      orderBy: [{ group: "asc" }, { name: "asc" }],
    });

    // Kelompokkan per group
    const grouped = permissions.reduce<
      Record<string, { group: string; permissions: typeof permissions }>
    >((acc, perm) => {
      const group = perm.group ?? "General";
      if (!acc[group]) acc[group] = { group, permissions: [] };
      acc[group].permissions.push(perm);
      return acc;
    }, {});

    return NextResponse.json(Object.values(grouped));
  });

export { GET };
