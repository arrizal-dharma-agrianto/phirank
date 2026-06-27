import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthorizationContext } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";

type TenantSettingsRow = {
  id: string;
  timezone: string;
  locale: string;
  currency: string;
  show_setup_progress: boolean;
};

const updateTenantSettingsSchema = z.object({
  showSetupProgress: z.boolean().optional(),
});

const serializeTenantSettings = (settings: TenantSettingsRow) => ({
  id: settings.id,
  timezone: settings.timezone,
  locale: settings.locale,
  currency: settings.currency,
  showSetupProgress: settings.show_setup_progress,
});

const getOrCreateTenantSettings = async (tenantId: string) => {
  const settings = await prisma.$queryRaw<TenantSettingsRow[]>`
    INSERT INTO tenant_settings (
      id,
      tenant_id,
      timezone,
      locale,
      currency,
      show_setup_progress,
      created_at,
      updated_at
    )
    VALUES (
      ${randomUUID()},
      ${tenantId},
      'Asia/Jakarta',
      'en',
      'USD',
      true,
      ${new Date()},
      ${new Date()}
    )
    ON CONFLICT (tenant_id) DO UPDATE
    SET updated_at = tenant_settings.updated_at
    RETURNING
      id,
      timezone,
      locale,
      currency,
      show_setup_progress
  `;

  return settings[0];
};

const GET = async (req: Request) =>
  withAuth(req, async ({ userId }) => {
    const authorization = await getAuthorizationContext(userId);

    if (!authorization) {
      return NextResponse.json(
        { message: "Tenant context not found" },
        { status: 403 },
      );
    }

    const settings = await getOrCreateTenantSettings(authorization.tenantId);

    return NextResponse.json(serializeTenantSettings(settings));
  });

const PATCH = async (req: Request) =>
  withAuth(req, async ({ userId, body }) => {
    const authorization = await getAuthorizationContext(userId);

    if (!authorization) {
      return NextResponse.json(
        { message: "Tenant context not found" },
        { status: 403 },
      );
    }

    const parsed = updateTenantSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message:
            parsed.error.issues[0]?.message ?? "Invalid settings request.",
        },
        { status: 400 },
      );
    }

    await getOrCreateTenantSettings(authorization.tenantId);
    const showSetupProgress = parsed.data.showSetupProgress ?? null;

    const rows = await prisma.$queryRaw<TenantSettingsRow[]>`
      UPDATE tenant_settings
      SET
        show_setup_progress = COALESCE(
          ${showSetupProgress},
          show_setup_progress
        ),
        updated_at = ${new Date()}
      WHERE tenant_id = ${authorization.tenantId}
      RETURNING
        id,
        timezone,
        locale,
        currency,
        show_setup_progress
    `;

    return NextResponse.json(serializeTenantSettings(rows[0]));
  });

export { GET, PATCH };
