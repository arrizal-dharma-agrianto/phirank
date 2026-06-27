import { getActiveTenantHeaders } from "@/modules/tenant/utils/active-tenant";

import type { WebsiteCrawlerInput } from "../schemas";
import type {
  BacklinkProfile,
  CrawlJob,
  CrawlPage,
  CrawlPageQuery,
  WebsiteCrawlerDetail,
  WebsiteCrawlerListItem,
} from "../types";

const getCrawlerWebsites = async (): Promise<WebsiteCrawlerListItem[]> => {
  const res = await fetch("/api/data-audit-crawler/websites", {
    headers: getActiveTenantHeaders(),
  });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message ?? "Failed to fetch crawler websites.");
  }

  return data;
};

const createCrawlerWebsite = async (
  input: WebsiteCrawlerInput,
): Promise<{ websiteId: string; crawlJobId: string }> => {
  const res = await fetch("/api/data-audit-crawler/websites", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getActiveTenantHeaders(),
    },
    body: JSON.stringify(input),
  });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message ?? "Failed to create crawler website.");
  }

  return data;
};

const getCrawlerWebsite = async (
  websiteId: string,
  query: CrawlPageQuery = {},
): Promise<WebsiteCrawlerDetail> => {
  const searchParams = new URLSearchParams();

  if (query.page) searchParams.set("page", String(query.page));
  if (query.pageSize) searchParams.set("pageSize", String(query.pageSize));
  if (query.search) searchParams.set("search", query.search);
  if (query.status) searchParams.set("status", query.status);
  if (query.indexability) {
    searchParams.set("indexability", query.indexability);
  }
  if (query.sortBy) searchParams.set("sortBy", query.sortBy);
  if (query.sortOrder) searchParams.set("sortOrder", query.sortOrder);

  const queryString = searchParams.toString();
  const res = await fetch(
    `/api/data-audit-crawler/websites/${encodeURIComponent(websiteId)}${queryString ? `?${queryString}` : ""}`,
    {
      headers: getActiveTenantHeaders(),
    },
  );
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message ?? "Failed to fetch crawler website.");
  }

  return data;
};

const getCrawlerPage = async (
  websiteId: string,
  pageId: string,
): Promise<CrawlPage> => {
  const res = await fetch(
    `/api/data-audit-crawler/websites/${encodeURIComponent(websiteId)}/pages/${encodeURIComponent(pageId)}`,
    {
      headers: getActiveTenantHeaders(),
    },
  );
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message ?? "Failed to fetch crawled page.");
  }

  return data;
};

const updateCrawlerWebsite = async (
  websiteId: string,
): Promise<{ crawlJobId: string }> => {
  const res = await fetch(
    `/api/data-audit-crawler/websites/${encodeURIComponent(websiteId)}/crawl`,
    {
      method: "POST",
      headers: getActiveTenantHeaders(),
    },
  );
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message ?? "Failed to update crawling.");
  }

  return data;
};

const refreshCrawlerWebsiteBacklinks = async (
  websiteId: string,
): Promise<BacklinkProfile> => {
  const res = await fetch(
    `/api/data-audit-crawler/websites/${encodeURIComponent(websiteId)}/backlinks`,
    {
      method: "POST",
      headers: getActiveTenantHeaders(),
    },
  );
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message ?? "Failed to refresh backlink profile.");
  }

  return data;
};

const getCrawlerJobs = async (): Promise<CrawlJob[]> => {
  const res = await fetch("/api/data-audit-crawler/crawl-jobs", {
    headers: getActiveTenantHeaders(),
  });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message ?? "Failed to fetch crawl jobs.");
  }

  return data;
};

const deleteCrawlerJob = async (crawlJobId: string): Promise<void> => {
  const res = await fetch(
    `/api/data-audit-crawler/crawl-jobs/${encodeURIComponent(crawlJobId)}`,
    {
      method: "DELETE",
      headers: getActiveTenantHeaders(),
    },
  );
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message ?? "Failed to delete crawl job.");
  }
};

export {
  createCrawlerWebsite,
  deleteCrawlerJob,
  getCrawlerJobs,
  getCrawlerPage,
  getCrawlerWebsite,
  getCrawlerWebsites,
  refreshCrawlerWebsiteBacklinks,
  updateCrawlerWebsite,
};
