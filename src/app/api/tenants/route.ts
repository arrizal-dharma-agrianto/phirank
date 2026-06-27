import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { generateSlug } from "@/lib/slug";
import { createTenantSchema } from "@/modules/tenant/schemas";

const GET = async (req: Request) => withAuth(req, async ({ userId }) => {
  const memberships = await prisma.tenantMember.findMany({
    where: {
      userId,
    },
    select: {
      id: true,
      role: {
        select: {
          name: true,
          slug: true,
        },
      },
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return NextResponse.json(
    memberships.map((membership) => ({
      membershipId: membership.id,
      role: membership.role,
      tenant: membership.tenant,
    })),
  );
});

const POST = async (req: Request) =>
  withAuth(req, async ({ userId, body }) => {
    const parsed = createTenantSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const name = parsed.data.name;

    const baseSlug = generateSlug(name);

    if (!baseSlug) {
      return NextResponse.json(
        { error: "Could not generate valid slug from tenant name" },
        { status: 400 }
      );
    }

    const existingTenant = await prisma.tenant.findUnique({
      where: {
        slug: baseSlug,
      },
    });

    const slug = existingTenant
      ? `${baseSlug}-${crypto.randomUUID().slice(0, 6)}`
      : baseSlug;


    const membership = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name,
          slug,
          settings: {
            create: {},
          },
        },
      });

      const ownerRole = await tx.role.findFirst({
        where: {
          tenantId: null,
          slug: "owner",
          isSystem: true,
        },
        select: {
          id: true,
        },
      });

      if (!ownerRole) {
        throw new Error("Global owner role not found");
      }

      return tx.tenantMember.create({
        data: {
          tenantId: tenant.id,
          userId,
          roleId: ownerRole.id,
        },
        select: {
          id: true,
          role: {
            select: {
              name: true,
              slug: true,
            },
          },
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
            },
          },
        },
      });
    });

    return NextResponse.json({
      membershipId: membership.id,
      role: membership.role,
      tenant: membership.tenant,
    });
  });


export { GET, POST };
