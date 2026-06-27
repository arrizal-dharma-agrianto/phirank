import { NextResponse } from "next/server";

import { getAuthorizationContext } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import type {
  ContentGeneratorDraftFilterStatus,
  ContentGeneratorDraftSortBy,
  ContentGeneratorDraftSortOrder,
} from "@/modules/content-generator/types";

type DraftListRow = {
  id: string;
  title: string;
  model: string | null;
  status: string;
  meta_title: string | null;
  meta_description: string | null;
  slug: string | null;
  strategy_summary: string | null;
  publish_delivery_id: string | null;
  publish_status_code: number | null;
  publish_error: string | null;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

type DraftCountRow = {
  total: bigint | number;
};

const DEFAULT_DRAFT_PAGE_SIZE = 10;
const MAX_DRAFT_PAGE_SIZE = 50;

const parsePositiveInt = (value: string | null) => {
  if (!value) return undefined;

  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined;
};

const parseEnum = <T extends string>(
  value: string | null,
  allowedValues: readonly T[],
) => (value && allowedValues.includes(value as T) ? (value as T) : undefined);

const normalizePagination = (req: Request) => {
  const { searchParams } = new URL(req.url);
  const page = parsePositiveInt(searchParams.get("page")) ?? 1;
  const pageSize =
    parsePositiveInt(searchParams.get("pageSize")) ?? DEFAULT_DRAFT_PAGE_SIZE;

  return {
    page: Math.max(1, page),
    pageSize: Math.min(MAX_DRAFT_PAGE_SIZE, Math.max(1, pageSize)),
    search: searchParams.get("search")?.trim() ?? "",
    status:
      parseEnum<ContentGeneratorDraftFilterStatus>(
        searchParams.get("status"),
        ["all", "draft", "published", "failed_to_publish"],
      ) ?? "all",
    sortBy:
      parseEnum<ContentGeneratorDraftSortBy>(searchParams.get("sortBy"), [
        "createdAt",
        "updatedAt",
        "title",
        "status",
        "publishedAt",
      ]) ?? "createdAt",
    sortOrder:
      parseEnum<ContentGeneratorDraftSortOrder>(
        searchParams.get("sortOrder"),
        ["asc", "desc"],
      ) ?? "desc",
  };
};

const getDraftFiltersSql = (
  tenantId: string,
  search: string,
  status: ContentGeneratorDraftFilterStatus,
) => {
  const filters = ["tenant_id = $1"];
  const params: unknown[] = [tenantId];

  if (search) {
    params.push(`%${search}%`);
    const searchParam = `$${params.length}`;

    filters.push(`(
      title ILIKE ${searchParam}
      OR meta_title ILIKE ${searchParam}
      OR meta_description ILIKE ${searchParam}
      OR slug ILIKE ${searchParam}
      OR strategy_summary ILIKE ${searchParam}
      OR status ILIKE ${searchParam}
      OR model ILIKE ${searchParam}
      OR publish_error ILIKE ${searchParam}
    )`);
  }

  if (status !== "all") {
    params.push(status);
    filters.push(`status = $${params.length}`);
  }

  return {
    params,
    whereSql: filters.join(" AND "),
  };
};

const getDraftOrderSql = (
  sortBy: ContentGeneratorDraftSortBy,
  sortOrder: ContentGeneratorDraftSortOrder,
) => {
  const direction = sortOrder === "asc" ? "ASC NULLS LAST" : "DESC NULLS LAST";

  switch (sortBy) {
    case "title":
      return `title ${direction}, created_at DESC`;
    case "status":
      return `status ${direction}, created_at DESC`;
    case "publishedAt":
      return `published_at ${direction}, created_at DESC`;
    case "updatedAt":
      return `updated_at ${direction}, created_at DESC`;
    case "createdAt":
    default:
      return `created_at ${direction}`;
  }
};

const serializeDraft = (draft: DraftListRow) => ({
  id: draft.id,
  title: draft.title,
  model: draft.model,
  status: draft.status,
  metaTitle: draft.meta_title,
  metaDescription: draft.meta_description,
  slug: draft.slug,
  strategySummary: draft.strategy_summary,
  publishDeliveryId: draft.publish_delivery_id,
  publishStatusCode: draft.publish_status_code,
  publishError: draft.publish_error,
  publishedAt: draft.published_at?.toISOString() ?? null,
  createdAt: draft.created_at.toISOString(),
  updatedAt: draft.updated_at.toISOString(),
});

const GET = async (req: Request) =>
  withAuth(req, async ({ userId }) => {
    const authorization = await getAuthorizationContext(userId);

    if (!authorization) {
      return NextResponse.json(
        { message: "Tenant context not found" },
        { status: 403 },
      );
    }

    const paginationInput = normalizePagination(req);
    const filters = getDraftFiltersSql(
      authorization.tenantId,
      paginationInput.search,
      paginationInput.status,
    );
    const orderSql = getDraftOrderSql(
      paginationInput.sortBy,
      paginationInput.sortOrder,
    );
    const counts = await prisma.$queryRawUnsafe<DraftCountRow[]>(
      `
      SELECT COUNT(*) AS total
      FROM content_generator_drafts
      WHERE ${filters.whereSql}
    `,
      ...filters.params,
    );
    const total = Number(counts[0]?.total ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / paginationInput.pageSize));
    const page = Math.min(paginationInput.page, totalPages);
    const offset = (page - 1) * paginationInput.pageSize;
    const drafts = await prisma.$queryRawUnsafe<DraftListRow[]>(
      `
      SELECT
        id,
        title,
        model,
        status,
        meta_title,
        meta_description,
        slug,
        strategy_summary,
        publish_delivery_id,
        publish_status_code,
        publish_error,
        published_at,
        created_at,
        updated_at
      FROM content_generator_drafts
      WHERE ${filters.whereSql}
      ORDER BY ${orderSql}
      LIMIT $${filters.params.length + 1}
      OFFSET $${filters.params.length + 2}
    `,
      ...filters.params,
      paginationInput.pageSize,
      offset,
    );

    return NextResponse.json({
      items: drafts.map(serializeDraft),
      pagination: {
        page,
        pageSize: paginationInput.pageSize,
        total,
        totalPages,
      },
    });
  });

export { GET };
