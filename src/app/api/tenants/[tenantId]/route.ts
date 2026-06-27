import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { updateTenantSchema } from "@/modules/tenant";
import { generateSlug } from "@/lib/slug";

type Params = {
  params: Promise<{
    tenantId: string;
  }>;
};

export const PATCH = async (req: Request, { params }: Params) =>
  withAuth(req, async ({ userId, body }) => {
    const { tenantId } = await params;

    const parsed = updateTenantSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Bad request", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const membership = await prisma.tenantMember.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
      select: {
        role: {
          select: {
            slug: true,
          },
        },
      },
    });

    if (!membership || membership.role.slug !== "owner") {
      return NextResponse.json(
        { message: "Only owner can update tenant" },
        { status: 403 },
      );
    }

    const baseSlug = generateSlug(parsed.data.name);

    const existingTenant = await prisma.tenant.findFirst({
      where: {
        slug: baseSlug,
        NOT: {
          id: tenantId,
        },
      },
      select: {
        id: true,
      },
    });

    const slug = existingTenant
      ? `${baseSlug}-${crypto.randomUUID().slice(0, 6)}`
      : baseSlug;

    const tenant = await prisma.tenant.update({
      where: {
        id: tenantId,
      },
      data: {
        name: parsed.data.name,
        slug,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
      },
    });

    return NextResponse.json(tenant);
  });

export const DELETE = async (req: Request, { params }: Params) =>
  withAuth(req, async ({ userId }) => {
    const { tenantId } = await params;

    const membership = await prisma.tenantMember.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
      select: {
        role: {
          select: {
            slug: true,
          },
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { message: "Forbidden" },
        { status: 403 },
      );
    }

    if (membership.role.slug !== "owner") {
      return NextResponse.json(
        { message: "Only owner can delete tenant" },
        { status: 403 },
      );
    }

    await prisma.tenant.delete({
      where: {
        id: tenantId,
      },
    });

    return NextResponse.json({
      message: "Tenant deleted successfully",
    });
  });