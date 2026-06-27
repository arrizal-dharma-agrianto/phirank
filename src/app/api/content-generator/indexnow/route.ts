import { randomBytes, randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { getAuthorizationContext } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { getConfiguredWebsite } from "@/modules/data-audit-crawler/services/server/website.service";

type IndexNowStatus =
  | "pending_setup"
  | "key_verified"
  | "ready"
  | "submission_failed";

type IndexNowAction = "enable" | "verify" | "refresh";

type IndexNowRow = {
  id: string;
  key: string;
  key_location: string;
  status: IndexNowStatus;
  last_verified_at: Date | null;
  last_submitted_url: string | null;
  last_error: string | null;
  created_at: Date;
  updated_at: Date;
};

const INDEXNOW_KEY_FILE_EXTENSION = ".txt";

const createIndexNowKey = () => randomBytes(32).toString("hex");

const getWebsiteOrigin = (startUrl: string) => {
  const url = new URL(startUrl);

  return url.origin;
};

const createKeyLocation = (websiteStartUrl: string, key: string) =>
  `${getWebsiteOrigin(websiteStartUrl)}/${key}${INDEXNOW_KEY_FILE_EXTENSION}`;

const serializeIndexNow = (row: IndexNowRow | null) => {
  if (!row) {
    return {
      status: "not_enabled" as const,
      key: null,
      keyLocation: null,
      lastVerifiedAt: null,
      lastSubmittedUrl: null,
      lastError: null,
      createdAt: null,
      updatedAt: null,
    };
  }

  return {
    status: row.status,
    key: row.key,
    keyLocation: row.key_location,
    lastVerifiedAt: row.last_verified_at?.toISOString() ?? null,
    lastSubmittedUrl: row.last_submitted_url,
    lastError: row.last_error,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
};

const getIndexNowRow = async (tenantId: string) => {
  const rows = await prisma.$queryRaw<IndexNowRow[]>`
    SELECT
      id,
      key,
      key_location,
      status,
      last_verified_at,
      last_submitted_url,
      last_error,
      created_at,
      updated_at
    FROM content_generator_indexnow
    WHERE tenant_id = ${tenantId}
    LIMIT 1
  `;

  return rows[0] ?? null;
};

const syncKeyLocation = async (
  tenantId: string,
  row: IndexNowRow | null,
  websiteStartUrl: string,
) => {
  if (!row) return null;

  const keyLocation = createKeyLocation(websiteStartUrl, row.key);

  if (keyLocation === row.key_location) {
    return row;
  }

  const now = new Date();
  const rows = await prisma.$queryRaw<IndexNowRow[]>`
    UPDATE content_generator_indexnow
    SET
      key_location = ${keyLocation},
      status = 'pending_setup',
      last_error = NULL,
      updated_at = ${now}
    WHERE tenant_id = ${tenantId}
    RETURNING
      id,
      key,
      key_location,
      status,
      last_verified_at,
      last_submitted_url,
      last_error,
      created_at,
      updated_at
  `;

  return rows[0] ?? row;
};

const verifyKeyFile = async (keyLocation: string, key: string) => {
  let response: Response;

  try {
    response = await fetch(keyLocation, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? `Unable to fetch key file: ${error.message}`
          : "Unable to fetch key file.",
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      error: `Key file returned HTTP ${response.status}.`,
    };
  }

  const content = (await response.text()).trim();

  if (content !== key) {
    return {
      ok: false,
      error: "Key file content does not match the generated IndexNow key.",
    };
  }

  return { ok: true, error: null };
};

const updateStatus = async (
  tenantId: string,
  status: IndexNowStatus,
  lastError: string | null,
) => {
  const now = new Date();

  const rows = await prisma.$queryRaw<IndexNowRow[]>`
    UPDATE content_generator_indexnow
    SET
      status = ${status},
      last_verified_at = ${status === "ready" || status === "key_verified" ? now : null},
      last_error = ${lastError},
      updated_at = ${now}
    WHERE tenant_id = ${tenantId}
    RETURNING
      id,
      key,
      key_location,
      status,
      last_verified_at,
      last_submitted_url,
      last_error,
      created_at,
      updated_at
  `;

  return rows[0] ?? null;
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

    const [website, indexNowRow] = await Promise.all([
      getConfiguredWebsite(authorization.tenantId),
      getIndexNowRow(authorization.tenantId),
    ]);
    const indexNow = website
      ? await syncKeyLocation(
          authorization.tenantId,
          indexNowRow,
          website.startUrl,
        )
      : indexNowRow;

    return NextResponse.json({
      indexNow: serializeIndexNow(indexNow),
      website: website
        ? {
            id: website.id,
            name: website.name,
            startUrl: website.startUrl,
          }
        : null,
    });
  });

const POST = async (req: Request) =>
  withAuth<{ action?: IndexNowAction }>(req, async ({ userId, body }) => {
    const authorization = await getAuthorizationContext(userId);

    if (!authorization) {
      return NextResponse.json(
        { message: "Tenant context not found" },
        { status: 403 },
      );
    }

    const action = body?.action;

    if (!action || !["enable", "verify", "refresh"].includes(action)) {
      return NextResponse.json(
        { message: "Invalid IndexNow action." },
        { status: 400 },
      );
    }

    const website = await getConfiguredWebsite(authorization.tenantId);

    if (!website) {
      return NextResponse.json(
        {
          message:
            "Configure a website in workspace settings before enabling IndexNow.",
        },
        { status: 400 },
      );
    }

    if (action === "enable") {
      const existing = await syncKeyLocation(
        authorization.tenantId,
        await getIndexNowRow(authorization.tenantId),
        website.startUrl,
      );

      if (existing) {
        return NextResponse.json({
          indexNow: serializeIndexNow(existing),
          website: {
            id: website.id,
            name: website.name,
            startUrl: website.startUrl,
          },
        });
      }

      const key = createIndexNowKey();
      const keyLocation = createKeyLocation(website.startUrl, key);
      const now = new Date();

      const rows = await prisma.$queryRaw<IndexNowRow[]>`
        INSERT INTO content_generator_indexnow (
          id,
          tenant_id,
          key,
          key_location,
          status,
          created_at,
          updated_at
        )
        VALUES (
          ${randomUUID()},
          ${authorization.tenantId},
          ${key},
          ${keyLocation},
          'pending_setup',
          ${now},
          ${now}
        )
        RETURNING
          id,
          key,
          key_location,
          status,
          last_verified_at,
          last_submitted_url,
          last_error,
          created_at,
          updated_at
      `;

      return NextResponse.json(
        {
          indexNow: serializeIndexNow(rows[0]),
          website: {
            id: website.id,
            name: website.name,
            startUrl: website.startUrl,
          },
        },
        { status: 201 },
      );
    }

    const existing = await syncKeyLocation(
      authorization.tenantId,
      await getIndexNowRow(authorization.tenantId),
      website.startUrl,
    );

    if (!existing) {
      return NextResponse.json(
        { message: "Enable IndexNow before verifying the key file." },
        { status: 400 },
      );
    }

    const verification = await verifyKeyFile(
      existing.key_location,
      existing.key,
    );
    const updated = await updateStatus(
      authorization.tenantId,
      verification.ok ? "ready" : "pending_setup",
      verification.error,
    );

    return NextResponse.json({
      indexNow: serializeIndexNow(updated),
      website: {
        id: website.id,
        name: website.name,
        startUrl: website.startUrl,
      },
    });
  });

export { GET, POST };
