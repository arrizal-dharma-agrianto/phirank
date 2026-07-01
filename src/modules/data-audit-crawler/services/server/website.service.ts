import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";
import type { WebsiteCrawlerInput } from "@/modules/data-audit-crawler/schemas";
import type {
  ContentGap,
  ContentAuditMetric,
  ContentAuditResult,
  DuplicateContentResult,
  HeadingNode,
} from "@/modules/data-audit-crawler/types";
import { normalizeWebsiteUrl } from "@/modules/data-audit-crawler/utils";

import { createCrawlJob, startCrawlJob } from "./crawl-job.service";
import { dataForSeoClient } from "./dataforseo.client";

type WebsiteRow = {
  id: string;
  name: string;
  domain: string;
  start_url: string;
  industry: string | null;
  target_country: string;
  target_language: string;
  crawl_status: string;
  current_crawl_job_id: string | null;
  last_crawled_at: Date | null;
  created_at: Date;
  max_crawl_pages: number;
};

type CrawlJobRow = {
  id: string;
  website_id?: string;
  website_name?: string;
  provider: string;
  provider_task_id: string | null;
  status: string;
  max_crawl_pages: number;
  started_at: Date | null;
  finished_at: Date | null;
  elapsed_time_ms: number | null;
  error_message: string | null;
  created_at: Date;
};

type CrawlPageRow = {
  id: string;
  website_id?: string;
  website_name?: string;
  website_start_url?: string;
  url: string;
  status_code: number | null;
  title: string | null;
  meta_description: string | null;
  h1: string | null;
  word_count: number | null;
  internal_links_count: number | null;
  external_links_count: number | null;
  images_missing_alt_count: number | null;
  is_indexable: boolean | null;
  is_mobile_friendly: boolean | null;
  canonical_url: string | null;
  heading_structure?: unknown;
  raw_metrics?: unknown;
};

type CrawlSummaryRow = {
  total_pages: number;
  crawled_pages: number;
  broken_links_count: number;
  redirects_count: number;
  missing_title_count: number;
  missing_meta_description_count: number;
  missing_h1_count: number;
  missing_alt_text_count: number;
  created_at: Date;
};

type BacklinkProfileRow = {
  id: string;
  provider: string;
  target: string;
  total_backlinks: number;
  referring_domains: number;
  referring_main_domains: number;
  dofollow_backlinks: number;
  nofollow_backlinks: number;
  created_at: Date;
};

type CrawlPageSortBy =
  | "url"
  | "statusCode"
  | "title"
  | "wordCount"
  | "missingAlt"
  | "createdAt";

type CrawlPageListInput = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: "all" | "success" | "redirect" | "error" | "unknown";
  indexability?: "all" | "indexable" | "noindex" | "unknown";
  sortBy?: CrawlPageSortBy;
  sortOrder?: "asc" | "desc";
};

type CrawlPageCountRow = {
  total: bigint | number;
};

type InternalLinkCandidateRow = {
  url: string;
  title: string | null;
  h1: string | null;
};

type SitemapPageRow = {
  url: string;
  canonical_url: string | null;
  updated_at: Date;
};

const DEFAULT_CRAWL_PAGE_SIZE = 10;
const MAX_CRAWL_PAGE_SIZE = 100;

const isBacklinkProfileEnabled = () => {
  return process.env.BACKLINK_PROFILE !== "false";
};

const normalizePageListInput = (input: CrawlPageListInput = {}) => {
  const page = Number.isFinite(input.page) && input.page ? input.page : 1;
  const pageSize =
    Number.isFinite(input.pageSize) && input.pageSize
      ? input.pageSize
      : DEFAULT_CRAWL_PAGE_SIZE;

  return {
    page: Math.max(1, Math.floor(page)),
    pageSize: Math.min(
      MAX_CRAWL_PAGE_SIZE,
      Math.max(1, Math.floor(pageSize)),
    ),
    search: input.search?.trim() ?? "",
    status: input.status ?? "all",
    indexability: input.indexability ?? "all",
    sortBy: input.sortBy ?? "createdAt",
    sortOrder: input.sortOrder ?? "desc",
  };
};

const getCrawlPageOrderSql = (
  sortBy: CrawlPageSortBy,
  sortOrder: "asc" | "desc",
) => {
  const direction = sortOrder === "asc" ? "ASC NULLS LAST" : "DESC NULLS LAST";

  switch (sortBy) {
    case "url":
      return `crawl_pages.url ${direction}`;
    case "statusCode":
      return `crawl_pages.status_code ${direction}`;
    case "title":
      return `crawl_pages.title ${direction}`;
    case "wordCount":
      return `crawl_pages.word_count ${direction}`;
    case "missingAlt":
      return `crawl_pages.images_missing_alt_count ${direction}`;
    case "createdAt":
    default:
      return `crawl_pages.created_at ${direction}`;
  }
};

const getCrawlPageFiltersSql = (
  currentCrawlJobId: string | null,
  input: ReturnType<typeof normalizePageListInput>,
) => {
  const filters = ["crawl_pages.crawl_job_id = $1"];
  const params: unknown[] = [currentCrawlJobId];

  if (input.search) {
    params.push(`%${input.search}%`);
    const searchParam = `$${params.length}`;

    filters.push(`(
      crawl_pages.url ILIKE ${searchParam}
      OR crawl_pages.title ILIKE ${searchParam}
      OR crawl_pages.meta_description ILIKE ${searchParam}
      OR crawl_pages.h1 ILIKE ${searchParam}
    )`);
  }

  if (input.status === "success") {
    filters.push("crawl_pages.status_code >= 200");
    filters.push("crawl_pages.status_code < 300");
  } else if (input.status === "redirect") {
    filters.push("crawl_pages.status_code >= 300");
    filters.push("crawl_pages.status_code < 400");
  } else if (input.status === "error") {
    filters.push("crawl_pages.status_code >= 400");
  } else if (input.status === "unknown") {
    filters.push("crawl_pages.status_code IS NULL");
  }

  if (input.indexability === "indexable") {
    filters.push("crawl_pages.is_indexable = true");
  } else if (input.indexability === "noindex") {
    filters.push("crawl_pages.is_indexable = false");
  } else if (input.indexability === "unknown") {
    filters.push("crawl_pages.is_indexable IS NULL");
  }

  return {
    params,
    whereSql: filters.join(" AND "),
  };
};

const serializeWebsite = (website: WebsiteRow) => ({
  id: website.id,
  name: website.name,
  domain: website.domain,
  startUrl: website.start_url,
  industry: website.industry,
  targetCountry: website.target_country,
  targetLanguage: website.target_language,
  crawlStatus: website.crawl_status,
  currentCrawlJobId: website.current_crawl_job_id,
  lastCrawledAt: website.last_crawled_at?.toISOString() ?? null,
  maxCrawlPages: website.max_crawl_pages,
  createdAt: website.created_at.toISOString(),
});

const serializeJob = (job: CrawlJobRow) => ({
  id: job.id,
  websiteId: job.website_id,
  websiteName: job.website_name,
  provider: job.provider,
  providerTaskId: job.provider_task_id,
  status: job.status,
  maxCrawlPages: job.max_crawl_pages,
  startedAt: job.started_at?.toISOString() ?? null,
  finishedAt: job.finished_at?.toISOString() ?? null,
  elapsedTimeMs: job.elapsed_time_ms,
  errorMessage: job.error_message,
  createdAt: job.created_at.toISOString(),
});

const serializeHeadingStructure = (value: unknown): HeadingNode[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;

      const record = item as Record<string, unknown>;
      const level = Number(record.level);
      const text = typeof record.text === "string" ? record.text.trim() : "";

      if (![1, 2, 3, 4, 5, 6].includes(level) || !text) return null;

      return {
        level: level as HeadingNode["level"],
        text,
        order: Number(record.order) || index + 1,
      };
    })
    .filter((heading): heading is HeadingNode => Boolean(heading));
};

const serializeKeywordDensity = (value: unknown) => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const record = item as Record<string, unknown>;
      const keyword =
        typeof record.keyword === "string" ? record.keyword.trim() : "";
      const occurrences = Number(record.occurrences);
      const density = Number(record.density);

      if (!keyword || !Number.isFinite(occurrences) || !Number.isFinite(density)) {
        return null;
      }

      return {
        keyword,
        occurrences,
        density,
      };
    })
    .filter(
      (
        item,
      ): item is {
        keyword: string;
        occurrences: number;
        density: number;
      } => Boolean(item),
    );
};

const getKeywordDensityFromRawMetrics = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];

  const record = value as Record<string, unknown>;
  const content =
    record.content && typeof record.content === "object"
      ? (record.content as Record<string, unknown>)
      : {};

  return (
    serializeKeywordDensity(record.keywordDensity).length
      ? serializeKeywordDensity(record.keywordDensity)
      : serializeKeywordDensity(record.keyword_density).length
        ? serializeKeywordDensity(record.keyword_density)
        : serializeKeywordDensity(content.keyword_density)
  );
};

const serializeContentAuditMetrics = (value: unknown): ContentAuditMetric[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const record = item as Record<string, unknown>;
      const key = typeof record.key === "string" ? record.key : "";
      const label = typeof record.label === "string" ? record.label : "";
      const status = typeof record.status === "string" ? record.status : "";
      const metricValue =
        typeof record.value === "string" ? record.value : String(record.value ?? "");
      const description =
        typeof record.description === "string" ? record.description : "";

      if (
        ![
          "wordCount",
          "readability",
          "headingCoverage",
          "metadata",
          "internalLinks",
          "imageAlt",
          "keywordBalance",
          "duplicateContent",
          "contentGaps",
        ].includes(key) ||
        !["pass", "review", "fail"].includes(status) ||
        !label
      ) {
        return null;
      }

      return {
        key: key as ContentAuditMetric["key"],
        label,
        status: status as ContentAuditMetric["status"],
        value: metricValue,
        description,
      };
    })
    .filter((metric): metric is ContentAuditMetric => Boolean(metric));
};

const serializeContentAudit = (value: unknown): ContentAuditResult | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;
  const score = Number(record.score);
  const wordCount = Number(record.wordCount ?? record.word_count);
  const thinContent = record.thinContent ?? record.thin_content;

  if (
    !Number.isFinite(score) ||
    !Number.isFinite(wordCount) ||
    typeof thinContent !== "boolean"
  ) {
    return null;
  }

  return {
    score,
    wordCount,
    thinContent,
    metrics: serializeContentAuditMetrics(record.metrics),
  };
};

const getContentAuditFromRawMetrics = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;
  const content =
    record.content && typeof record.content === "object"
      ? (record.content as Record<string, unknown>)
      : {};

  return (
    serializeContentAudit(record.contentAudit) ??
    serializeContentAudit(record.content_audit) ??
    serializeContentAudit(record.contentQuality) ??
    serializeContentAudit(record.content_quality) ??
    serializeContentAudit(content.content_quality)
  );
};

const serializeContentGaps = (value: unknown): ContentGap[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }

      const record = item as Record<string, unknown>;
      const key = typeof record.key === "string" ? record.key : "";
      const label = typeof record.label === "string" ? record.label : "";
      const severity =
        typeof record.severity === "string" ? record.severity : "";
      const recommendation =
        typeof record.recommendation === "string"
          ? record.recommendation
          : "";

      if (
        ![
          "insufficientDepth",
          "missingSubtopics",
          "missingMetadataContext",
          "missingInternalLinks",
          "missingMediaSupport",
          "weakTopicCoverage",
        ].includes(key) ||
        !["Low", "Medium", "High"].includes(severity) ||
        !label ||
        !recommendation
      ) {
        return null;
      }

      return {
        key: key as ContentGap["key"],
        label,
        severity: severity as ContentGap["severity"],
        recommendation,
      };
    })
    .filter((gap): gap is ContentGap => Boolean(gap));
};

const getContentGapsFromRawMetrics = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];

  const record = value as Record<string, unknown>;
  const content =
    record.content && typeof record.content === "object"
      ? (record.content as Record<string, unknown>)
      : {};

  return serializeContentGaps(record.contentGaps).length
    ? serializeContentGaps(record.contentGaps)
    : serializeContentGaps(record.content_gaps).length
      ? serializeContentGaps(record.content_gaps)
      : serializeContentGaps(content.content_gaps);
};

const serializeDuplicateContent = (
  value: unknown,
): DuplicateContentResult | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;
  const checked = record.checked;
  const isDuplicate = record.isDuplicate ?? record.is_duplicate;
  const matchCount = Number(record.matchCount ?? record.match_count);

  if (
    typeof checked !== "boolean" ||
    typeof isDuplicate !== "boolean" ||
    !Number.isFinite(matchCount)
  ) {
    return null;
  }

  const matches = Array.isArray(record.matches)
    ? record.matches
        .map((item) => {
          if (!item || typeof item !== "object" || Array.isArray(item)) {
            return null;
          }

          const match = item as Record<string, unknown>;
          const url = typeof match.url === "string" ? match.url : "";
          const title = typeof match.title === "string" ? match.title : null;

          if (!url) return null;

          return {
            url,
            title,
          };
        })
        .filter(
          (match): match is { url: string; title: string | null } =>
            Boolean(match),
        )
    : [];

  return {
    checked,
    isDuplicate,
    matchCount,
    matches,
  };
};

const getDuplicateContentFromRawMetrics = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;
  const content =
    record.content && typeof record.content === "object"
      ? (record.content as Record<string, unknown>)
      : {};

  return (
    serializeDuplicateContent(record.duplicateContent) ??
    serializeDuplicateContent(record.duplicate_content) ??
    serializeDuplicateContent(content.duplicate_content)
  );
};

const serializePage = (page: CrawlPageRow) => ({
  id: page.id,
  websiteId: page.website_id,
  websiteName: page.website_name,
  websiteStartUrl: page.website_start_url,
  url: page.url,
  statusCode: page.status_code,
  title: page.title,
  metaDescription: page.meta_description,
  h1: page.h1,
  wordCount: page.word_count,
  internalLinksCount: page.internal_links_count,
  externalLinksCount: page.external_links_count,
  imagesMissingAltCount: page.images_missing_alt_count,
  isIndexable: page.is_indexable,
  isMobileFriendly: page.is_mobile_friendly,
  canonicalUrl: page.canonical_url,
  headingStructure: serializeHeadingStructure(page.heading_structure),
  keywordDensity: getKeywordDensityFromRawMetrics(page.raw_metrics),
  contentAudit: getContentAuditFromRawMetrics(page.raw_metrics),
  contentGaps: getContentGapsFromRawMetrics(page.raw_metrics),
  duplicateContent: getDuplicateContentFromRawMetrics(page.raw_metrics),
});

const serializeSummary = (summary?: CrawlSummaryRow) => {
  if (!summary) return null;

  return {
    totalPages: summary.total_pages,
    crawledPages: summary.crawled_pages,
    brokenLinksCount: summary.broken_links_count,
    redirectsCount: summary.redirects_count,
    missingTitleCount: summary.missing_title_count,
    missingMetaDescriptionCount: summary.missing_meta_description_count,
    missingH1Count: summary.missing_h1_count,
    missingAltTextCount: summary.missing_alt_text_count,
    createdAt: summary.created_at.toISOString(),
  };
};

const serializeBacklinkProfile = (profile?: BacklinkProfileRow) => {
  if (!profile) return null;

  return {
    id: profile.id,
    provider: profile.provider,
    target: profile.target,
    totalBacklinks: profile.total_backlinks,
    referringDomains: profile.referring_domains,
    referringMainDomains: profile.referring_main_domains,
    dofollowBacklinks: profile.dofollow_backlinks,
    nofollowBacklinks: profile.nofollow_backlinks,
    createdAt: profile.created_at.toISOString(),
  };
};

const getFirstBacklinksResult = (raw: unknown) => {
  if (!raw || typeof raw !== "object") return {};

  const tasks = (raw as { tasks?: unknown }).tasks;
  const task = Array.isArray(tasks) ? tasks[0] : null;
  const result = task && typeof task === "object"
    ? (task as { result?: unknown }).result
    : null;
  const firstResult = Array.isArray(result) ? result[0] : null;

  return firstResult && typeof firstResult === "object"
    ? (firstResult as Record<string, unknown>)
    : {};
};

const asBacklinkNumber = (
  source: Record<string, unknown>,
  keys: string[],
) => {
  for (const key of keys) {
    const value = source[key];

    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }

  return 0;
};

const extractBacklinkMetrics = (raw: unknown) => {
  const result = getFirstBacklinksResult(raw);

  return {
    totalBacklinks: asBacklinkNumber(result, [
      "backlinks",
      "total_backlinks",
      "backlinks_count",
      "referring_pages",
    ]),
    referringDomains: asBacklinkNumber(result, [
      "referring_domains",
      "referring_domains_count",
      "domains",
    ]),
    referringMainDomains: asBacklinkNumber(result, [
      "referring_main_domains",
      "referring_main_domains_count",
      "main_domains",
    ]),
    dofollowBacklinks: asBacklinkNumber(result, [
      "dofollow",
      "dofollow_backlinks",
      "backlinks_dofollow",
    ]),
    nofollowBacklinks: asBacklinkNumber(result, [
      "nofollow",
      "nofollow_backlinks",
      "backlinks_nofollow",
    ]),
  };
};

const hasBacklinkProfilesTable = async () => {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT to_regclass('public.backlink_profiles') IS NOT NULL AS "exists"
  `;

  return rows[0]?.exists ?? false;
};

const getLatestBacklinkProfile = async (websiteId: string) => {
  if (!isBacklinkProfileEnabled()) {
    return null;
  }

  if (!(await hasBacklinkProfilesTable())) {
    return null;
  }

  const profiles = await prisma.$queryRaw<BacklinkProfileRow[]>`
    SELECT
      id,
      provider,
      target,
      total_backlinks,
      referring_domains,
      referring_main_domains,
      dofollow_backlinks,
      nofollow_backlinks,
      created_at
    FROM backlink_profiles
    WHERE website_id = ${websiteId}
    ORDER BY created_at DESC
    LIMIT 1
  `;

  return serializeBacklinkProfile(profiles[0]);
};

const listWebsites = async (tenantId: string) => {
  const websites = await prisma.$queryRaw<WebsiteRow[]>`
    SELECT
      id,
      name,
      domain,
      start_url,
      industry,
      target_country,
      target_language,
      crawl_status,
      current_crawl_job_id,
      last_crawled_at,
      created_at,
      max_crawl_pages
    FROM websites
    WHERE tenant_id = ${tenantId}
    ORDER BY created_at ASC
    LIMIT 1
  `;

  return websites.map(serializeWebsite);
};

const getConfiguredWebsite = async (tenantId: string) => {
  const websites = await prisma.$queryRaw<WebsiteRow[]>`
    SELECT
      id,
      name,
      domain,
      start_url,
      industry,
      target_country,
      target_language,
      crawl_status,
      current_crawl_job_id,
      last_crawled_at,
      max_crawl_pages,
      created_at
    FROM websites
    WHERE tenant_id = ${tenantId}
    ORDER BY created_at ASC
    LIMIT 1
  `;

  const website = websites[0];

  return website ? serializeWebsite(website) : null;
};

const createWebsiteAndStartCrawl = async (
  tenantId: string,
  userId: string,
  input: WebsiteCrawlerInput,
) => {
  const normalized = normalizeWebsiteUrl(input.websiteUrl);
  const now = new Date();
  const existingWebsite = await getConfiguredWebsite(tenantId);
  const websiteId = existingWebsite?.id ?? randomUUID();

  if (existingWebsite) {
    await prisma.$executeRaw`
      UPDATE websites
      SET
        user_id = ${userId},
        name = ${input.name},
        domain = ${normalized.domain},
        start_url = ${normalized.startUrl},
        industry = ${input.industry || null},
        target_country = ${input.targetCountry || "Indonesia"},
        target_language = ${input.targetLanguage || "id"},
        max_crawl_pages = ${input.maxCrawlPages},
        crawl_status = 'unstarted',
        updated_at = ${now}
      WHERE id = ${websiteId}
        AND tenant_id = ${tenantId}
    `;
  } else {
    try {
      await prisma.$executeRaw`
        INSERT INTO websites (
          id,
          tenant_id,
          user_id,
          name,
          domain,
          start_url,
          industry,
          target_country,
          target_language,
          crawl_status,
          max_crawl_pages,
          created_at,
          updated_at
        )
        VALUES (
          ${websiteId},
          ${tenantId},
          ${userId},
          ${input.name},
          ${normalized.domain},
          ${normalized.startUrl},
          ${input.industry || null},
          ${input.targetCountry || "Indonesia"},
          ${input.targetLanguage || "id"},
          'unstarted',
          ${input.maxCrawlPages},
          ${now},
          ${now}
        )
      `;
    } catch {
      throw new Error("Website ini sudah terdaftar di workspace aktif.");
    }
  }

  // const crawlJobId = await createCrawlJob(websiteId, input.maxCrawlPages);
  // await startCrawlJob(crawlJobId);

  return {
    websiteId,
    // crawlJobId,
  };
};

const startWebsiteCrawl = async (
  tenantId: string,
  websiteId: string,
) => {
  const websites = await prisma.$queryRaw<
    { id: string; max_crawl_pages: number }[]
  >`
    SELECT id, max_crawl_pages
    FROM websites
    WHERE id = ${websiteId}
      AND tenant_id = ${tenantId}
    LIMIT 1
  `;

  const website = websites[0];

  if (!website) {
    throw new Error("Website not found.");
  }

  const crawlJobId = await createCrawlJob(websiteId, website.max_crawl_pages);
  await startCrawlJob(crawlJobId);

  return crawlJobId;
};

const getWebsiteDetail = async (
  tenantId: string,
  websiteId: string,
  pageInput: CrawlPageListInput = {},
) => {
  const normalizedPageInput = normalizePageListInput(pageInput);
  const websites = await prisma.$queryRaw<WebsiteRow[]>`
    SELECT
      id,
      name,
      domain,
      start_url,
      industry,
      target_country,
      target_language,
      crawl_status,
      current_crawl_job_id,
      last_crawled_at,
      max_crawl_pages,
      created_at
    FROM websites
    WHERE id = ${websiteId}
      AND tenant_id = ${tenantId}
    LIMIT 1
  `;

  const website = websites[0];

  if (!website) {
    return null;
  }

  const pageFilters = getCrawlPageFiltersSql(
    website.current_crawl_job_id,
    normalizedPageInput,
  );
  const pageOrderSql = getCrawlPageOrderSql(
    normalizedPageInput.sortBy,
    normalizedPageInput.sortOrder,
  );
  const pageOffset =
    (normalizedPageInput.page - 1) * normalizedPageInput.pageSize;

  const [summaries, backlinkProfile, pages, pageCounts, jobs] = await Promise.all([
    prisma.$queryRaw<CrawlSummaryRow[]>`
      SELECT
        total_pages,
        crawled_pages,
        broken_links_count,
        redirects_count,
        missing_title_count,
        missing_meta_description_count,
        missing_h1_count,
        missing_alt_text_count,
        created_at
      FROM crawl_summaries
      WHERE crawl_job_id = ${website.current_crawl_job_id}
      ORDER BY created_at DESC
      LIMIT 1
    `,
    getLatestBacklinkProfile(websiteId),
    prisma.$queryRawUnsafe<CrawlPageRow[]>(
      `
      SELECT
        id,
        url,
        status_code,
        title,
        meta_description,
        h1,
        word_count,
        internal_links_count,
        external_links_count,
        images_missing_alt_count,
        is_indexable,
        is_mobile_friendly,
        canonical_url
      FROM crawl_pages
      WHERE ${pageFilters.whereSql}
      ORDER BY ${pageOrderSql}, crawl_pages.id ASC
      LIMIT $${pageFilters.params.length + 1}
      OFFSET $${pageFilters.params.length + 2}
    `,
      ...pageFilters.params,
      normalizedPageInput.pageSize,
      pageOffset,
    ),
    prisma.$queryRawUnsafe<CrawlPageCountRow[]>(
      `
      SELECT COUNT(*) AS total
      FROM crawl_pages
      WHERE ${pageFilters.whereSql}
    `,
      ...pageFilters.params,
    ),
    prisma.$queryRaw<CrawlJobRow[]>`
      SELECT
        id,
        provider,
        provider_task_id,
        status,
        max_crawl_pages,
        started_at,
        finished_at,
        elapsed_time_ms,
        error_message,
        created_at
      FROM crawl_jobs
      WHERE website_id = ${websiteId}
      ORDER BY created_at DESC
      LIMIT 10
    `,
  ]);

  return {
    ...serializeWebsite(website),
    latestSummary: serializeSummary(summaries[0]),
    backlinkProfileEnabled: isBacklinkProfileEnabled(),
    backlinkProfile,
    pages: pages.map(serializePage),
    pagesPagination: {
      page: normalizedPageInput.page,
      pageSize: normalizedPageInput.pageSize,
      total: Number(pageCounts[0]?.total ?? 0),
      totalPages: Math.max(
        1,
        Math.ceil(
          Number(pageCounts[0]?.total ?? 0) / normalizedPageInput.pageSize,
        ),
      ),
      search: normalizedPageInput.search,
      status: normalizedPageInput.status,
      indexability: normalizedPageInput.indexability,
      sortBy: normalizedPageInput.sortBy,
      sortOrder: normalizedPageInput.sortOrder,
    },
    jobs: jobs.map(serializeJob),
  };
};

const refreshBacklinkProfile = async (
  tenantId: string,
  websiteId: string,
) => {
  const websites = await prisma.$queryRaw<{ id: string; domain: string }[]>`
    SELECT id, domain
    FROM websites
    WHERE id = ${websiteId}
      AND tenant_id = ${tenantId}
    LIMIT 1
  `;
  const website = websites[0];

  if (!website) {
    throw new Error("Website not found.");
  }

  if (!isBacklinkProfileEnabled()) {
    throw new Error("Backlink profile feature is disabled.");
  }

  if (!(await hasBacklinkProfilesTable())) {
    throw new Error(
      "Backlink profile table is missing. Run the latest Prisma migration before refreshing backlinks.",
    );
  }

  const raw = await dataForSeoClient.getBacklinksSummary(website.domain);
  const metrics = extractBacklinkMetrics(raw);
  const id = randomUUID();

  await prisma.$executeRaw`
    INSERT INTO backlink_profiles (
      id,
      website_id,
      provider,
      target,
      total_backlinks,
      referring_domains,
      referring_main_domains,
      dofollow_backlinks,
      nofollow_backlinks,
      raw_response,
      created_at
    )
    VALUES (
      ${id},
      ${websiteId},
      'dataforseo',
      ${website.domain},
      ${metrics.totalBacklinks},
      ${metrics.referringDomains},
      ${metrics.referringMainDomains},
      ${metrics.dofollowBacklinks},
      ${metrics.nofollowBacklinks},
      ${JSON.stringify(raw)}::jsonb,
      NOW()
    )
  `;

  const profiles = await prisma.$queryRaw<BacklinkProfileRow[]>`
    SELECT
      id,
      provider,
      target,
      total_backlinks,
      referring_domains,
      referring_main_domains,
      dofollow_backlinks,
      nofollow_backlinks,
      created_at
    FROM backlink_profiles
    WHERE id = ${id}
    LIMIT 1
  `;

  return serializeBacklinkProfile(profiles[0]);
};

const getCrawlPageDetail = async (
  tenantId: string,
  websiteId: string,
  pageId: string,
) => {
  const pages = await prisma.$queryRaw<CrawlPageRow[]>`
    SELECT
      crawl_pages.id,
      crawl_pages.website_id,
      websites.name AS website_name,
      websites.start_url AS website_start_url,
      crawl_pages.url,
      crawl_pages.status_code,
      crawl_pages.title,
      crawl_pages.meta_description,
      crawl_pages.h1,
      crawl_pages.word_count,
      crawl_pages.internal_links_count,
      crawl_pages.external_links_count,
      crawl_pages.images_missing_alt_count,
      crawl_pages.is_indexable,
      crawl_pages.is_mobile_friendly,
      crawl_pages.canonical_url,
      crawl_pages.heading_structure,
      crawl_pages.raw_metrics
    FROM crawl_pages
    INNER JOIN websites ON websites.id = crawl_pages.website_id
    WHERE crawl_pages.id = ${pageId}
      AND crawl_pages.website_id = ${websiteId}
      AND websites.tenant_id = ${tenantId}
      AND crawl_pages.crawl_job_id = websites.current_crawl_job_id
    LIMIT 1
  `;

  const page = pages[0];

  return page ? serializePage(page) : null;
};

const listCurrentCrawlPageInternalLinks = async (
  tenantId: string,
  limit = 30,
) => {
  const pages = await prisma.$queryRaw<InternalLinkCandidateRow[]>`
    SELECT
      crawl_pages.url,
      crawl_pages.title,
      crawl_pages.h1
    FROM crawl_pages
    INNER JOIN websites ON websites.id = crawl_pages.website_id
    WHERE websites.tenant_id = ${tenantId}
      AND crawl_pages.crawl_job_id = websites.current_crawl_job_id
      AND crawl_pages.url IS NOT NULL
      AND (
        crawl_pages.status_code IS NULL
        OR crawl_pages.status_code < 400
      )
    ORDER BY
      CASE WHEN crawl_pages.url = websites.start_url THEN 0 ELSE 1 END,
      crawl_pages.internal_links_count DESC NULLS LAST,
      crawl_pages.created_at DESC
    LIMIT ${Math.max(1, Math.min(100, limit))}
  `;

  return pages.map((page) => {
    const label = page.title ?? page.h1;

    return label ? `${page.url} - ${label}` : page.url;
  });
};

const listCurrentCrawlSitemapUrls = async (
  tenantId: string,
  limit = 1000,
) => {
  const pages = await prisma.$queryRaw<SitemapPageRow[]>`
    SELECT
      crawl_pages.url,
      crawl_pages.canonical_url,
      crawl_pages.updated_at
    FROM crawl_pages
    INNER JOIN websites ON websites.id = crawl_pages.website_id
    WHERE websites.tenant_id = ${tenantId}
      AND crawl_pages.crawl_job_id = websites.current_crawl_job_id
      AND crawl_pages.url IS NOT NULL
      AND (
        crawl_pages.status_code IS NULL
        OR crawl_pages.status_code < 400
      )
      AND (
        crawl_pages.is_indexable IS NULL
        OR crawl_pages.is_indexable = true
      )
    ORDER BY
      CASE WHEN crawl_pages.url = websites.start_url THEN 0 ELSE 1 END,
      crawl_pages.updated_at DESC,
      crawl_pages.url ASC
    LIMIT ${Math.max(1, Math.min(1000, limit))}
  `;

  const seenUrls = new Set<string>();

  return pages
    .map((page) => ({
      url: page.canonical_url || page.url,
      sourceUrl: page.url,
      lastModified: page.updated_at.toISOString(),
    }))
    .filter((page) => {
      if (seenUrls.has(page.url)) return false;

      seenUrls.add(page.url);
      return true;
    });
};

const listCrawlJobs = async (tenantId: string) => {
  const jobs = await prisma.$queryRaw<CrawlJobRow[]>`
    SELECT
      crawl_jobs.id,
      crawl_jobs.website_id,
      websites.name AS website_name,
      crawl_jobs.provider,
      crawl_jobs.provider_task_id,
      crawl_jobs.status,
      crawl_jobs.max_crawl_pages,
      crawl_jobs.started_at,
      crawl_jobs.finished_at,
      crawl_jobs.elapsed_time_ms,
      crawl_jobs.error_message,
      crawl_jobs.created_at
    FROM crawl_jobs
    INNER JOIN websites ON websites.id = crawl_jobs.website_id
    WHERE websites.tenant_id = ${tenantId}
    ORDER BY crawl_jobs.created_at DESC
  `;

  return jobs.map(serializeJob);
};

const deleteCrawlJob = async (tenantId: string, crawlJobId: string) => {
  const jobs = await prisma.$queryRaw<{ id: string; website_id: string }[]>`
    SELECT crawl_jobs.id, crawl_jobs.website_id
    FROM crawl_jobs
    INNER JOIN websites ON websites.id = crawl_jobs.website_id
    WHERE crawl_jobs.id = ${crawlJobId}
      AND websites.tenant_id = ${tenantId}
    LIMIT 1
  `;

  const job = jobs[0];

  if (!job) {
    return false;
  }

  await prisma.$executeRaw`
    UPDATE websites
    SET current_crawl_job_id = NULL
    WHERE id = ${job.website_id}
      AND current_crawl_job_id = ${crawlJobId}
  `;

  await prisma.$executeRaw`
    DELETE FROM crawl_jobs
    WHERE id = ${crawlJobId}
  `;

  return true;
};

export {
  createWebsiteAndStartCrawl,
  deleteCrawlJob,
  getConfiguredWebsite,
  getCrawlPageDetail,
  getWebsiteDetail,
  listCurrentCrawlPageInternalLinks,
  listCurrentCrawlSitemapUrls,
  listCrawlJobs,
  listWebsites,
  refreshBacklinkProfile,
  startWebsiteCrawl,
};
