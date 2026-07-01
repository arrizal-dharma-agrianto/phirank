type CrawlStatus = "pending" | "running" | "completed" | "failed";

type CrawlSummary = {
  totalPages: number;
  crawledPages: number;
  brokenLinksCount: number;
  redirectsCount: number;
  missingTitleCount: number;
  missingMetaDescriptionCount: number;
  missingH1Count: number;
  missingAltTextCount: number;
  createdAt: string;
};

type BacklinkProfile = {
  id: string;
  provider: string;
  target: string;
  totalBacklinks: number;
  referringDomains: number;
  referringMainDomains: number;
  dofollowBacklinks: number;
  nofollowBacklinks: number;
  createdAt: string;
};

type CrawlJob = {
  id: string;
  websiteId?: string;
  websiteName?: string;
  provider: string;
  providerTaskId: string | null;
  status: CrawlStatus;
  maxCrawlPages: number;
  startedAt: string | null;
  finishedAt: string | null;
  elapsedTimeMs: number | null;
  errorMessage: string | null;
  createdAt: string;
};

type CrawlPage = {
  id: string;
  websiteId?: string;
  websiteName?: string;
  websiteStartUrl?: string;
  url: string;
  statusCode: number | null;
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  wordCount: number | null;
  internalLinksCount: number | null;
  externalLinksCount: number | null;
  imagesMissingAltCount: number | null;
  isIndexable: boolean | null;
  isMobileFriendly: boolean | null;
  canonicalUrl: string | null;
  headingStructure: HeadingNode[];
  keywordDensity: KeywordDensityItem[];
  contentAudit: ContentAuditResult | null;
  contentGaps: ContentGap[];
  duplicateContent: DuplicateContentResult | null;
};

type KeywordDensityItem = {
  keyword: string;
  occurrences: number;
  density: number;
};

type ContentAuditStatus = "pass" | "review" | "fail";

type ContentAuditMetric = {
  key:
    | "wordCount"
    | "readability"
    | "headingCoverage"
    | "metadata"
    | "internalLinks"
    | "imageAlt"
    | "keywordBalance"
    | "duplicateContent"
    | "contentGaps";
  label: string;
  status: ContentAuditStatus;
  value: string;
  description: string;
};

type ContentAuditResult = {
  score: number;
  wordCount: number;
  thinContent: boolean;
  metrics: ContentAuditMetric[];
};

type ContentGap = {
  key:
    | "insufficientDepth"
    | "missingSubtopics"
    | "missingMetadataContext"
    | "missingInternalLinks"
    | "missingMediaSupport"
    | "weakTopicCoverage";
  label: string;
  severity: "Low" | "Medium" | "High";
  recommendation: string;
};

type DuplicateContentMatch = {
  url: string;
  title: string | null;
};

type DuplicateContentResult = {
  checked: boolean;
  isDuplicate: boolean;
  matchCount: number;
  matches: DuplicateContentMatch[];
};

type HeadingNode = {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  order: number;
};

type CrawlPageSortBy =
  | "url"
  | "statusCode"
  | "title"
  | "wordCount"
  | "missingAlt"
  | "createdAt";

type CrawlPageSortOrder = "asc" | "desc";
type CrawlPageStatusFilter =
  | "all"
  | "success"
  | "redirect"
  | "error"
  | "unknown";
type CrawlPageIndexabilityFilter =
  | "all"
  | "indexable"
  | "noindex"
  | "unknown";

type CrawlPageQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: CrawlPageStatusFilter;
  indexability?: CrawlPageIndexabilityFilter;
  sortBy?: CrawlPageSortBy;
  sortOrder?: CrawlPageSortOrder;
};

type CrawlPagePagination = Required<CrawlPageQuery> & {
  total: number;
  totalPages: number;
};

type WebsiteCrawlerListItem = {
  id: string;
  name: string;
  domain: string;
  startUrl: string;
  industry: string | null;
  targetCountry: string;
  targetLanguage: string;
  crawlStatus: CrawlStatus;
  lastCrawledAt: string | null;
  currentCrawlJobId: string | null;
  maxCrawlPages: number;
  createdAt: string;
};

type WebsiteCrawlerDetail = WebsiteCrawlerListItem & {
  latestSummary: CrawlSummary | null;
  backlinkProfileEnabled: boolean;
  backlinkProfile: BacklinkProfile | null;
  pages: CrawlPage[];
  pagesPagination: CrawlPagePagination;
  jobs: CrawlJob[];
};

export type {
  BacklinkProfile,
  CrawlJob,
  HeadingNode,
  CrawlPage,
  CrawlPageIndexabilityFilter,
  CrawlPagePagination,
  CrawlPageQuery,
  CrawlPageSortBy,
  CrawlPageSortOrder,
  CrawlPageStatusFilter,
  CrawlStatus,
  CrawlSummary,
  WebsiteCrawlerDetail,
  WebsiteCrawlerListItem,
  KeywordDensityItem,
  ContentAuditMetric,
  ContentAuditResult,
  ContentAuditStatus,
  ContentGap,
  DuplicateContentMatch,
  DuplicateContentResult,
};
