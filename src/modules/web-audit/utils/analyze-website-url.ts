import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import {
  analyzeContentGaps,
  analyzeContentQuality,
  getKeywordDensity,
  withContentGapsMetric,
} from "@/modules/data-audit-crawler/utils";

import type { AuditCategory, AuditFinding, WebAuditResult } from "../types";

const MAX_HTML_BYTES = 1_000_000;
const MAX_RESOURCE_BYTES = 200_000;
const MAX_REDIRECTS = 5;
const REQUEST_TIMEOUT_MS = 10_000;
const LIGHTHOUSE_NAVIGATION_TIMEOUT_MS = 45_000;

type FetchTargetResult = {
  body: string;
  contentLength: number;
  contentType: string;
  finalUrl: string;
  responseTimeMs: number;
  statusCode: number;
  headers: Headers;
  redirectCount: number;
};

type PageMetadata = {
  title: string | null;
  description: string | null;
  canonical: string | null;
  h1Count: number;
  headingCount: number;
  imageCount: number;
  imagesWithoutAlt: number;
  viewport: string | null;
  openGraphTitle: string | null;
  robotsMeta: string | null;
};

type LighthouseCategoryId =
  | "performance"
  | "seo"
  | "accessibility"
  | "best-practices";

type LighthouseAudit = {
  id: string;
  score: number | null;
  scoreDisplayMode?: string;
  title: string;
  description?: string;
  displayValue?: string;
};

type LighthouseResult = {
  categories: Partial<
    Record<
      LighthouseCategoryId,
      {
        score: number | null;
        auditRefs?: Array<{ id: string }>;
      }
    >
  >;
  audits: Record<string, LighthouseAudit>;
  finalDisplayedUrl?: string;
};

type LighthouseAnalysis = {
  categories: Partial<Record<LighthouseCategoryId, AuditCategory>>;
  mobileFriendliness?: AuditCategory;
  findings: AuditFinding[];
};

type AnalyzeWebsiteUrlOptions = {
  onProgress?: (progress: number, currentStep: string) => Promise<void> | void;
};

const privateIpv4Ranges = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.168\./,
  /^0\./,
];

const normalizeUrl = (url: string) => {
  const parsedUrl = new URL(url);
  parsedUrl.hash = "";
  return parsedUrl.toString();
};

const isPrivateIp = (address: string) => {
  if (isIP(address) === 4) {
    return privateIpv4Ranges.some((range) => range.test(address));
  }

  if (isIP(address) === 6) {
    const normalized = address.toLowerCase();
    return (
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80:")
    );
  }

  return false;
};

const assertSafeUrl = async (url: string) => {
  const parsedUrl = new URL(url);

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("URL must use http or https.");
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new Error("Localhost URLs cannot be audited.");
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });

  if (!addresses.length) {
    throw new Error("Could not resolve the target hostname.");
  }

  if (addresses.some((address) => isPrivateIp(address.address))) {
    throw new Error("Private or internal network URLs cannot be audited.");
  }
};

const readLimitedText = async (response: Response, maxBytes: number) => {
  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    totalBytes += value.byteLength;

    if (totalBytes > maxBytes) {
      reader.cancel();
      break;
    }

    chunks.push(value);
  }

  const bytes = new Uint8Array(
    chunks.reduce((total, chunk) => total + chunk.byteLength, 0),
  );
  let offset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
};

const fetchTarget = async (
  initialUrl: string,
  maxBytes: number,
  redirectCount = 0,
): Promise<FetchTargetResult> => {
  if (redirectCount > MAX_REDIRECTS) {
    throw new Error("Too many redirects.");
  }

  const normalizedUrl = normalizeUrl(initialUrl);
  await assertSafeUrl(normalizedUrl);

  const startedAt = performance.now();
  const response = await fetch(normalizedUrl, {
    redirect: "manual",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      Accept: "text/html,application/xhtml+xml,text/plain;q=0.8,*/*;q=0.5",
      "User-Agent": "WebAnalyzerBot/0.1 (+https://webanalyzer.local)",
    },
  });
  const responseTimeMs = Math.round(performance.now() - startedAt);

  if (
    [301, 302, 303, 307, 308].includes(response.status) &&
    response.headers.has("location")
  ) {
    const nextUrl = new URL(response.headers.get("location")!, normalizedUrl);
    const redirected = await fetchTarget(
      nextUrl.toString(),
      maxBytes,
      redirectCount + 1,
    );

    return {
      ...redirected,
      redirectCount: redirected.redirectCount + 1,
      responseTimeMs: responseTimeMs + redirected.responseTimeMs,
    };
  }

  const body = await readLimitedText(response, maxBytes);

  return {
    body,
    contentLength: body.length,
    contentType: response.headers.get("content-type") ?? "",
    finalUrl: response.url || normalizedUrl,
    responseTimeMs,
    statusCode: response.status,
    headers: response.headers,
    redirectCount,
  };
};

const getTagContent = (html: string, pattern: RegExp) => {
  const match = html.match(pattern);
  return match?.[1]?.trim() || null;
};

const getMetaContent = (html: string, name: string) => {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      `<meta[^>]+name=["']${escapedName}["'][^>]+content=["']([^"']*)["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${escapedName}["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+property=["']${escapedName}["'][^>]+content=["']([^"']*)["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${escapedName}["'][^>]*>`,
      "i",
    ),
  ];

  for (const pattern of patterns) {
    const value = getTagContent(html, pattern);
    if (value) return value;
  }

  return null;
};

const hasAttribute = (tag: string, attribute: string) => {
  return new RegExp(`\\s${attribute}(?:=["'][^"']*["']|\\s|>)`, "i").test(tag);
};

const parseMetadata = (html: string): PageMetadata => {
  const title = getTagContent(html, /<title[^>]*>([^<]*)<\/title>/i);
  const description = getMetaContent(html, "description");
  const canonical = getTagContent(
    html,
    /<link[^>]+rel=["'][^"']*canonical[^"']*["'][^>]+href=["']([^"']*)["'][^>]*>/i,
  );
  const viewport = getMetaContent(html, "viewport");
  const openGraphTitle = getMetaContent(html, "og:title");
  const robotsMeta = getMetaContent(html, "robots");
  const h1Count = html.match(/<h1(?:\s|>)/gi)?.length ?? 0;
  const headingCount = html.match(/<h[1-6](?:\s|>)/gi)?.length ?? 0;
  const imageTags = html.match(/<img\b[^>]*>/gi) ?? [];
  const imagesWithoutAlt = imageTags.filter((tag) => !hasAttribute(tag, "alt"));

  return {
    title,
    description,
    canonical,
    h1Count,
    headingCount,
    imageCount: imageTags.length,
    imagesWithoutAlt: imagesWithoutAlt.length,
    viewport,
    openGraphTitle,
    robotsMeta,
  };
};

const getBodyText = (html: string) => {
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;

  return body
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<template[\s\S]*?<\/template>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<canvas[\s\S]*?<\/canvas>/gi, " ")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
};

const getHeader = (headers: Headers, key: string) => {
  return headers.get(key) ?? headers.get(key.toLowerCase());
};

const checkResourceExists = async (origin: string, path: string) => {
  try {
    const result = await fetchTarget(
      new URL(path, origin).toString(),
      MAX_RESOURCE_BYTES,
    );

    return result.statusCode >= 200 && result.statusCode < 400;
  } catch {
    return false;
  }
};

const scoreFromChecks = (checks: boolean[]) => {
  if (!checks.length) return 0;
  return Math.round(
    (checks.filter(Boolean).length / checks.length) * 100,
  );
};

const addFinding = (
  findings: AuditFinding[],
  condition: boolean,
  finding: AuditFinding,
) => {
  if (condition) findings.push(finding);
};

const toLighthouseScore = (score?: number | null) => {
  if (typeof score !== "number") return null;
  return Math.round(score * 100);
};

const getLighthouseAuditFindingSeverity = (
  score: number | null,
): AuditFinding["severity"] => {
  if (score === null) return "Low";
  if (score < 0.5) return "High";
  if (score < 0.9) return "Medium";
  return "Low";
};

const getLighthouseCategoryKey = (
  categoryId?: LighthouseCategoryId,
): AuditFinding["category"] => {
  if (!categoryId) return undefined;
  return categoryId === "best-practices" ? "bestPractices" : categoryId;
};

const effortWeight = {
  Rendah: 1,
  Sedang: 2,
  Tinggi: 3,
} as const;

const getFindingEffort = (
  finding: AuditFinding,
): NonNullable<AuditFinding["effort"]> => {
  if (finding.effort) return finding.effort;

  const content = `${finding.title} ${finding.description}`.toLowerCase();

  if (
    content.includes("title") ||
    content.includes("meta") ||
    content.includes("h1") ||
    content.includes("robots") ||
    content.includes("sitemap") ||
    content.includes("viewport") ||
    content.includes("alt text")
  ) {
    return "Rendah";
  }

  if (finding.category === "security" || finding.category === "performance") {
    return "Sedang";
  }

  return "Sedang";
};

const getFindingImpact = (
  finding: AuditFinding,
): NonNullable<AuditFinding["impact"]> => {
  if (finding.impact) return finding.impact;
  if (finding.severity === "High") return "Tinggi";
  if (finding.severity === "Medium") return "Sedang";
  return "Rendah";
};

const getFindingPriority = (
  finding: AuditFinding,
): NonNullable<AuditFinding["priority"]> => {
  if (finding.priority) return finding.priority;

  const effort = getFindingEffort(finding);
  const impact = getFindingImpact(finding);

  if (impact === "Tinggi" && effort === "Rendah") return "Quick win";
  if (impact === "Tinggi") return "Prioritas tinggi";
  if (impact === "Sedang" && effort !== "Tinggi") return "Jadwalkan";
  return "Pantau";
};

const prioritizeFindings = (findings: AuditFinding[]) => {
  return findings
    .map((finding) => ({
      ...finding,
      effort: getFindingEffort(finding),
      impact: getFindingImpact(finding),
      priority: getFindingPriority(finding),
    }))
    .sort((a, b) => {
      const aScore = effortWeight[a.impact] * 10 - effortWeight[a.effort];
      const bScore = effortWeight[b.impact] * 10 - effortWeight[b.effort];

      return bScore - aScore;
    });
};

const mobileFriendlinessAuditIds = new Set([
  "viewport",
  "tap-targets",
  "font-size",
]);

const getLighthouseSummary = (
  lhr: LighthouseResult,
  categoryId: LighthouseCategoryId,
) => {
  if (categoryId === "performance") {
    const fcp = lhr.audits["first-contentful-paint"]?.displayValue;
    const lcp = lhr.audits["largest-contentful-paint"]?.displayValue;
    const cls = lhr.audits["cumulative-layout-shift"]?.displayValue;
    return [fcp ? `FCP ${fcp}` : null, lcp ? `LCP ${lcp}` : null, cls ? `CLS ${cls}` : null]
      .filter(Boolean)
      .join(", ");
  }

  return "Measured by Lighthouse.";
};

const runLighthouseAnalysis = async (
  url: string,
): Promise<LighthouseAnalysis | null> => {
  if (process.env.WEB_AUDIT_LIGHTHOUSE_ENABLED === "false") {
    return null;
  }

  const [{ default: lighthouse }, chromeLauncher] = await Promise.all([
    import("lighthouse"),
    import("chrome-launcher"),
  ]);

  const chrome = await chromeLauncher.launch({
    chromePath: process.env.CHROME_PATH,
    chromeFlags: [
      "--headless=new",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
    logLevel: "silent",
  });

  try {
    const runnerResult = await lighthouse(url, {
      logLevel: "error",
      onlyCategories: [
        "performance",
        "accessibility",
        "best-practices",
        "seo",
      ],
      output: "json",
      port: chrome.port,
      maxWaitForLoad: LIGHTHOUSE_NAVIGATION_TIMEOUT_MS,
      throttlingMethod: "simulate",
    });

    if (!runnerResult?.lhr) {
      throw new Error("Lighthouse did not return a result.");
    }

    const lhr = runnerResult.lhr as LighthouseResult;
    const categories: LighthouseAnalysis["categories"] = {};
    const categoryLabels: Record<LighthouseCategoryId, string> = {
      performance: "Performance",
      accessibility: "Accessibility",
      "best-practices": "Best Practices",
      seo: "SEO",
    };

    for (const categoryId of Object.keys(categoryLabels) as LighthouseCategoryId[]) {
      const score = toLighthouseScore(lhr.categories[categoryId]?.score);

      if (score === null) continue;

      const key =
        categoryId === "best-practices" ? "bestPractices" : categoryId;

      categories[categoryId] = {
        key,
        label: categoryLabels[categoryId],
        score,
        summary: getLighthouseSummary(lhr, categoryId),
      } as AuditCategory;
    }

    const auditCategoryIds = new Map<string, LighthouseCategoryId>();

    for (const categoryId of Object.keys(categoryLabels) as LighthouseCategoryId[]) {
      const auditRefs = lhr.categories[categoryId]?.auditRefs ?? [];

      for (const auditRef of auditRefs) {
        auditCategoryIds.set(auditRef.id, categoryId);
      }
    }

    const mobileAudits = [...mobileFriendlinessAuditIds]
      .map((auditId) => lhr.audits[auditId])
      .filter((audit): audit is LighthouseAudit => {
        return Boolean(audit) && audit.score !== null;
      });
    const mobileFriendliness =
      mobileAudits.length > 0
        ? ({
            key: "mobileFriendliness",
            label: "Mobile Friendliness",
            score: Math.round(
              (mobileAudits.reduce(
                (total, audit) => total + (audit.score ?? 0),
                0,
              ) /
                mobileAudits.length) *
                100,
            ),
            summary: `${mobileAudits.filter((audit) => audit.score === 1).length}/${mobileAudits.length} mobile checks passed.`,
          } satisfies AuditCategory)
        : undefined;

    const findings = Object.values(lhr.audits)
      .filter((audit) => {
        return (
          audit.score !== null &&
          audit.score < 0.9 &&
          audit.scoreDisplayMode !== "notApplicable" &&
          audit.scoreDisplayMode !== "informative"
        );
      })
      .slice(0, 8)
      .map((audit) => ({
        title: `Lighthouse: ${audit.title}`,
        description:
          audit.displayValue ??
          audit.description ??
          "Lighthouse detected an improvement opportunity.",
        severity: getLighthouseAuditFindingSeverity(audit.score),
        category: mobileFriendlinessAuditIds.has(audit.id)
          ? "mobileFriendliness"
          : getLighthouseCategoryKey(auditCategoryIds.get(audit.id)),
      }));

    return {
      categories,
      mobileFriendliness,
      findings,
    };
  } finally {
    chrome.kill();
  }
};

const analyzeWebsiteUrl = async (
  url: string,
  options?: AnalyzeWebsiteUrlOptions,
): Promise<WebAuditResult> => {
  await options?.onProgress?.(15, "Validating target URL and fetching HTML");
  const page = await fetchTarget(url, MAX_HTML_BYTES);
  await options?.onProgress?.(35, "Reading metadata and response headers");
  const metadata = parseMetadata(page.body);
  const bodyText = getBodyText(page.body);
  const keywordDensity = getKeywordDensity(bodyText);
  const highestKeywordDensity = keywordDensity[0];
  const hasHighKeywordDensity =
    !!highestKeywordDensity && highestKeywordDensity.density > 4.5;
  const contentAudit = analyzeContentQuality({
    text: bodyText,
    title: metadata.title,
    metaDescription: metadata.description,
    headingsCount: metadata.headingCount,
    imageCount: metadata.imageCount,
    imagesMissingAltCount: metadata.imagesWithoutAlt,
    keywordDensity,
  });
  const contentGaps = analyzeContentGaps({
    text: bodyText,
    title: metadata.title,
    metaDescription: metadata.description,
    headingsCount: metadata.headingCount,
    imageCount: metadata.imageCount,
    imagesMissingAltCount: metadata.imagesWithoutAlt,
    keywordDensity,
  });
  const contentAuditWithGaps = withContentGapsMetric(
    contentAudit,
    contentGaps,
  );
  const failedContentMetric = contentAuditWithGaps.metrics.find(
    (metric) => metric.status === "fail",
  );
  const origin = new URL(page.finalUrl).origin;
  await options?.onProgress?.(50, "Checking robots.txt and sitemap.xml");
  const [hasRobotsTxt, hasSitemapXml] = await Promise.all([
    checkResourceExists(origin, "/robots.txt"),
    checkResourceExists(origin, "/sitemap.xml"),
  ]);

  const isHtml = page.contentType.toLowerCase().includes("text/html");
  const usesHttps = new URL(page.finalUrl).protocol === "https:";
  const hasHsts = !!getHeader(page.headers, "strict-transport-security");
  const hasCsp = !!getHeader(page.headers, "content-security-policy");
  const hasFrameOptions = !!getHeader(page.headers, "x-frame-options");
  const hasContentTypeOptions =
    getHeader(page.headers, "x-content-type-options")?.toLowerCase() ===
    "nosniff";
  const hasReferrerPolicy = !!getHeader(page.headers, "referrer-policy");
  const isFast = page.responseTimeMs <= 1200;
  const isReasonableHtmlSize = page.contentLength <= 500_000;
  const hasMobileViewport = Boolean(
    metadata.viewport && /width\s*=\s*device-width/i.test(metadata.viewport),
  );
  const allowsMobileZoom = !metadata.viewport
    ?.toLowerCase()
    .includes("user-scalable=no");

  const performanceScore = scoreFromChecks([
    page.statusCode >= 200 && page.statusCode < 400,
    isFast,
    isReasonableHtmlSize,
    page.redirectCount <= 1,
  ]);
  const seoScore = scoreFromChecks([
    isHtml,
    !!metadata.title && metadata.title.length <= 60,
    !!metadata.description && metadata.description.length <= 160,
    !!metadata.canonical,
    metadata.h1Count === 1,
    !hasHighKeywordDensity,
    hasRobotsTxt,
    hasSitemapXml,
  ]);
  const accessibilityScore = scoreFromChecks([
    !!metadata.viewport,
    metadata.h1Count > 0,
    metadata.imageCount === 0 || metadata.imagesWithoutAlt === 0,
  ]);
  const mobileFriendlinessScore = scoreFromChecks([
    hasMobileViewport,
    allowsMobileZoom,
    isReasonableHtmlSize,
    page.redirectCount <= 1,
  ]);
  const bestPracticesScore = scoreFromChecks([
    usesHttps,
    page.statusCode >= 200 && page.statusCode < 400,
    !!metadata.openGraphTitle,
    !metadata.robotsMeta?.toLowerCase().includes("noindex"),
  ]);
  const securityScore = scoreFromChecks([
    usesHttps,
    hasHsts,
    hasCsp,
    hasFrameOptions,
    hasContentTypeOptions,
    hasReferrerPolicy,
  ]);

  const httpCategories: AuditCategory[] = [
    {
      key: "performance",
      label: "Performance",
      score: performanceScore,
      summary: `${page.responseTimeMs}ms response, ${page.redirectCount} redirect(s).`,
    },
    {
      key: "seo",
      label: "SEO",
      score: seoScore,
      summary: `${metadata.title ? "Title found" : "Missing title"}, ${
        metadata.description ? "description found" : "missing description"
      }${
        highestKeywordDensity
          ? `, top keyword "${highestKeywordDensity.keyword}" at ${highestKeywordDensity.density.toFixed(2)}%`
          : ""
      }.`,
    },
    {
      key: "contentQuality",
      label: "Content Quality",
      score: contentAuditWithGaps.score,
      summary: `${contentAudit.wordCount} words, ${
        contentGaps.length
          ? `${contentGaps.length} content gap(s)`
          : contentAudit.thinContent
            ? "thin content detected"
            : "content depth ok"
      }.`,
    },
    {
      key: "accessibility",
      label: "Accessibility",
      score: accessibilityScore,
      summary:
        metadata.imageCount > 0
          ? `${metadata.imagesWithoutAlt}/${metadata.imageCount} images missing alt text.`
          : "No image alt text issues found.",
    },
    {
      key: "mobileFriendliness",
      label: "Mobile Friendliness",
      score: mobileFriendlinessScore,
      summary: hasMobileViewport
        ? "Responsive viewport configured."
        : "Mobile viewport is missing or not responsive.",
    },
    {
      key: "bestPractices",
      label: "Best Practices",
      score: bestPracticesScore,
      summary: usesHttps ? "HTTPS enabled." : "HTTPS is not enabled.",
    },
    {
      key: "security",
      label: "Security",
      score: securityScore,
      summary: `${[hasHsts, hasCsp, hasFrameOptions, hasContentTypeOptions, hasReferrerPolicy].filter(Boolean).length}/5 key security headers present.`,
    },
  ];

  const findings: AuditFinding[] = [];

  addFinding(findings, page.statusCode >= 400, {
    title: `HTTP status ${page.statusCode}`,
    description: "The audited URL returned an error response.",
    severity: "High",
    category: "bestPractices",
  });
  addFinding(findings, !isFast, {
    title: "Slow initial response",
    description: `The server responded in ${page.responseTimeMs}ms. Aim for under 1200ms for the initial HTML response.`,
    severity: "Medium",
    category: "performance",
  });
  addFinding(findings, !metadata.title, {
    title: "Missing page title",
    description: "Add a concise title tag so search engines and browser tabs can identify the page.",
    severity: "High",
    category: "seo",
  });
  addFinding(findings, !metadata.description, {
    title: "Missing meta description",
    description: "Add a meta description for clearer search snippets and previews.",
    severity: "Medium",
    category: "seo",
  });
  addFinding(findings, metadata.h1Count !== 1, {
    title: "Heading structure needs review",
    description: `Expected exactly one H1, found ${metadata.h1Count}.`,
    severity: "Medium",
    category: "seo",
  });
  addFinding(findings, hasHighKeywordDensity, {
    title: "High keyword density",
    description: highestKeywordDensity
      ? `"${highestKeywordDensity.keyword}" appears ${highestKeywordDensity.occurrences} time(s), about ${highestKeywordDensity.density.toFixed(2)}% of body words. Review the copy for natural language and keyword stuffing.`
      : "One repeated term or phrase dominates the page copy. Review the copy for natural language and keyword stuffing.",
    severity: "Medium",
    category: "contentQuality",
  });
  addFinding(findings, contentAudit.thinContent, {
    title: "Thin content",
    description: `The page has ${contentAudit.wordCount} body words. Add useful detail, examples, answers, or supporting sections so the page is more substantive.`,
    severity: "High",
    category: "contentQuality",
  });
  addFinding(findings, contentAuditWithGaps.score < 70 && !contentAudit.thinContent, {
    title: "Content quality needs review",
    description: failedContentMetric
      ? `${failedContentMetric.label}: ${failedContentMetric.description}`
      : "The content quality score is low. Review depth, readability, headings, metadata, internal links, and keyword balance.",
    severity: "Medium",
    category: "contentQuality",
  });
  addFinding(findings, contentGaps.length > 0, {
    title: "Content gaps detected",
    description: `${contentGaps[0]?.label ?? "Content gap"}: ${
      contentGaps[0]?.recommendation ??
      "Review missing supporting coverage for this page."
    }`,
    severity: contentGaps.some((gap) => gap.severity === "High")
      ? "High"
      : "Medium",
    category: "contentQuality",
  });
  addFinding(findings, metadata.imagesWithoutAlt > 0, {
    title: "Images missing alt text",
    description: `${metadata.imagesWithoutAlt} image(s) do not include alt text.`,
    severity: "Medium",
    category: "accessibility",
  });
  addFinding(findings, !hasMobileViewport, {
    title: "Mobile viewport is not responsive",
    description:
      "Add a viewport meta tag with width=device-width so pages scale correctly on mobile devices.",
    severity: "High",
    category: "mobileFriendliness",
  });
  addFinding(findings, !allowsMobileZoom, {
    title: "Mobile zoom is disabled",
    description:
      "Avoid user-scalable=no in the viewport meta tag so visitors can zoom content when needed.",
    severity: "Medium",
    category: "mobileFriendliness",
  });
  addFinding(findings, !hasRobotsTxt, {
    title: "robots.txt not found",
    description: "Add robots.txt to describe crawler access rules.",
    severity: "Low",
    category: "seo",
  });
  addFinding(findings, !hasSitemapXml, {
    title: "sitemap.xml not found",
    description: "Add a sitemap to help search engines discover important URLs.",
    severity: "Low",
    category: "seo",
  });
  addFinding(findings, !hasCsp, {
    title: "Missing Content-Security-Policy",
    description: "Add a CSP header to reduce the impact of script injection issues.",
    severity: "High",
    category: "security",
  });
  addFinding(findings, !hasHsts && usesHttps, {
    title: "Missing HSTS header",
    description: "Add Strict-Transport-Security so browsers prefer HTTPS for future visits.",
    severity: "Medium",
    category: "security",
  });

  let lighthouseAnalysis: LighthouseAnalysis | null = null;

  try {
    await options?.onProgress?.(65, "Running Lighthouse audit");
    lighthouseAnalysis = await runLighthouseAnalysis(page.finalUrl);
    await options?.onProgress?.(85, "Merging Lighthouse and HTTP findings");
  } catch (error) {
    findings.push({
      title: "Lighthouse audit unavailable",
      description:
        error instanceof Error
          ? error.message
          : "Lighthouse could not complete for this URL.",
      severity: "Medium",
      category: "bestPractices",
    });
  }

  const lighthouseCategories = lighthouseAnalysis?.categories ?? {};
  const categories = httpCategories.map((category) => {
    if (category.key === "performance") {
      return lighthouseCategories.performance ?? category;
    }

    if (category.key === "seo") {
      return lighthouseCategories.seo ?? category;
    }

    if (category.key === "accessibility") {
      return lighthouseCategories.accessibility ?? category;
    }

    if (category.key === "mobileFriendliness") {
      return lighthouseAnalysis?.mobileFriendliness ?? category;
    }

    if (category.key === "bestPractices") {
      return lighthouseCategories["best-practices"] ?? category;
    }

    return category;
  });

  if (lighthouseAnalysis?.findings.length) {
    findings.push(...lighthouseAnalysis.findings);
  }

  const overallScore = Math.round(
    categories.reduce((total, category) => total + category.score, 0) /
      categories.length,
  );
  await options?.onProgress?.(95, "Saving final audit result");

  const prioritizedFindings = prioritizeFindings(
    findings.length > 0
      ? findings
      : [
          {
            title: "Tidak ada temuan prioritas",
            description:
              "Analyzer tidak menemukan isu besar pada pemeriksaan ini.",
            severity: "Low",
            category: "bestPractices",
          },
        ],
  );

  return {
    url: page.finalUrl,
    auditedAt: new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date()),
    overallScore,
    categories,
    findings: prioritizedFindings,
  };
};

export { analyzeWebsiteUrl };
