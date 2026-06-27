import { CheerioCrawler } from "@crawlee/cheerio";
import { Configuration } from "@crawlee/core";
import { MemoryStorage } from "@crawlee/memory-storage";

import type { ContentAuditResult, KeywordDensityItem } from "../../types";
import {
  analyzeContentGaps,
  analyzeContentQuality,
  getContentFingerprint,
  getKeywordDensity,
  withContentGapsMetric,
} from "../../utils";

type CrawleeCrawlInput = {
  startUrl: string;
  domain: string;
  maxCrawlPages: number;
};

type CrawleePageResult = {
  url: string;
  normalized_url: string;
  status_code: number | null;
  meta: {
    title: string | null;
    description: string | null;
    h1: string | null;
    canonical: string | null;
    viewport: string | null;
  };
  content: {
    word_count: number;
    keyword_density: KeywordDensityItem[];
    content_quality: ContentAuditResult;
    content_gaps: ReturnType<typeof analyzeContentGaps>;
    content_fingerprint: string | null;
    headings: {
      level: 1 | 2 | 3 | 4 | 5 | 6;
      text: string;
      order: number;
    }[];
  };
  links: {
    internal: number;
    external: number;
  };
  images: {
    count: number;
    missing_alt: number;
  };
  checks: {
    noindex: boolean;
    mobile_friendly: boolean;
  };
};

type CrawleeLinkResult = {
  page_url: string;
  url: string;
  anchor_text: string | null;
  is_internal: boolean;
  status_code: number | null;
  final_url: string | null;
  redirect_chain: string[];
  redirect_hop_count: number;
  type: string;
};

type LinkStatusResult = {
  statusCode: number | null;
  finalUrl: string | null;
  redirectChain: string[];
};

type TextRoot = {
  length: number;
  first: () => TextRoot;
  clone: () => TextRoot;
  find: (selector: string) => { remove: () => void };
  text: () => string;
};

type TextSelector = (selector: string) => TextRoot;

const getConcurrency = () => {
  const value = Number(process.env.CRAWLEE_MAX_CONCURRENCY ?? 4);
  return Number.isFinite(value) && value > 0 ? value : 4;
};

const getRequestTimeoutSecs = () => {
  const value = Number(process.env.CRAWLEE_REQUEST_TIMEOUT_SECS ?? 20);
  return Number.isFinite(value) && value > 0 ? value : 20;
};

const getLinkStatusTimeoutSecs = () => {
  const value = Number(process.env.CRAWLEE_LINK_STATUS_TIMEOUT_SECS ?? 5);
  return Number.isFinite(value) && value > 0 ? value : 5;
};

const getLinkStatusCheckLimit = () => {
  const value = Number(process.env.CRAWLEE_LINK_STATUS_CHECK_LIMIT ?? 30);
  return Number.isFinite(value) && value > 0 ? value : 30;
};

const normalizeUrl = (value: string) => {
  const url = new URL(value);
  url.hash = "";
  return url.toString();
};

const normalizeHostname = (value: string) => {
  return value.replace(/^www\./i, "").toLowerCase();
};

const isInternalUrl = (value: string, domain: string) => {
  try {
    return normalizeHostname(new URL(value).hostname) === normalizeHostname(domain);
  } catch {
    return false;
  }
};

const getWordCount = (text: string) => {
  const words = text
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

  return words.length;
};

const getPageContentText = ($: TextSelector) => {
  const contentRoot = $("main, article, [role='main']").first();
  const textRoot = (contentRoot.length ? contentRoot : $("body")).clone();

  textRoot
    .find(
      [
        "script",
        "style",
        "noscript",
        "template",
        "svg",
        "canvas",
        "iframe",
        "header",
        "nav",
        "footer",
        "[aria-hidden='true']",
      ].join(","),
    )
    .remove();

  return textRoot.text().replace(/\s+/g, " ").trim();
};

const getLinkStatus = async (url: string): Promise<LinkStatusResult> => {
  const timeoutMs = getLinkStatusTimeoutSecs() * 1000;
  const redirectChain: string[] = [];
  let currentUrl = url;
  let statusCode: number | null = null;

  for (let hop = 0; hop < 10; hop += 1) {
    const response = await fetch(currentUrl, {
      method: "HEAD",
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });

    statusCode = response.status;

    if (statusCode < 300 || statusCode >= 400) {
      return {
        statusCode,
        finalUrl: currentUrl,
        redirectChain,
      };
    }

    const location = response.headers.get("location");

    if (!location) {
      return {
        statusCode,
        finalUrl: currentUrl,
        redirectChain,
      };
    }

    currentUrl = normalizeUrl(new URL(location, currentUrl).toString());
    redirectChain.push(currentUrl);
  }

  return {
    statusCode,
    finalUrl: currentUrl,
    redirectChain,
  };
};

const getLinkStatusResult = async (url: string): Promise<LinkStatusResult> => {
  const timeoutMs = getLinkStatusTimeoutSecs() * 1000;

  try {
    return await getLinkStatus(url);
  } catch {
    try {
      const get = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(timeoutMs),
      });

      return {
        statusCode: get.status,
        finalUrl: normalizeUrl(get.url || url),
        redirectChain: get.redirected ? [normalizeUrl(get.url || url)] : [],
      };
    } catch {
      return {
        statusCode: null,
        finalUrl: null,
        redirectChain: [],
      };
    }
  }
};

const checkLinksWithLimit = async (
  linkResults: CrawleeLinkResult[],
  limit = 10,
) => {
  const statusByUrl = new Map<string, LinkStatusResult>();
  let index = 0;

  const workers = Array.from({ length: limit }, async () => {
    while (index < linkResults.length) {
      const currentIndex = index++;
      const link = linkResults[currentIndex];
      const cachedStatus = statusByUrl.get(link.url);

      if (statusByUrl.has(link.url)) {
        link.status_code = cachedStatus?.statusCode ?? null;
        link.final_url = cachedStatus?.finalUrl ?? null;
        link.redirect_chain = cachedStatus?.redirectChain ?? [];
        link.redirect_hop_count = cachedStatus?.redirectChain.length ?? 0;
        continue;
      }

      const status = await getLinkStatusResult(link.url);
      statusByUrl.set(link.url, status);
      link.status_code = status.statusCode;
      link.final_url = status.finalUrl;
      link.redirect_chain = status.redirectChain;
      link.redirect_hop_count = status.redirectChain.length;
    }
  });

  await Promise.all(workers);
};

const runCrawleeCrawl = async ({
  startUrl,
  domain,
  maxCrawlPages,
}: CrawleeCrawlInput) => {
  const pages = new Map<string, CrawleePageResult>();
  const links = new Map<string, CrawleeLinkResult>();
  const failedRequests: string[] = [];
  const configuration = new Configuration({
    storageClient: new MemoryStorage(),
    purgeOnStart: true,
  });
  const crawler = new CheerioCrawler(
    {
      maxRequestsPerCrawl: maxCrawlPages,
      maxConcurrency: getConcurrency(),
      requestHandlerTimeoutSecs: getRequestTimeoutSecs(),
      async requestHandler({ request, response, $, enqueueLinks }) {
        const pageUrl = normalizeUrl(request.loadedUrl ?? request.url);
        const title = $("title").first().text().trim() || null;
        const description =
          $('meta[name="description"]').attr("content")?.trim() || null;
        const h1 = $("h1").first().text().trim() || null;
        const canonicalHref = $('link[rel="canonical"]').attr("href")?.trim();
        const canonical = canonicalHref
          ? normalizeUrl(new URL(canonicalHref, pageUrl).toString())
          : null;
        const viewport =
          $('meta[name="viewport"]').attr("content")?.trim() || null;
        const normalizedViewport = viewport?.toLowerCase() ?? "";
        const hasMobileViewport = /width\s*=\s*device-width/i.test(
          normalizedViewport,
        );
        const preventsZoom = normalizedViewport.includes("user-scalable=no");
        const robots = $('meta[name="robots"]').attr("content") ?? "";
        const bodyText = getPageContentText($);
        const headings = $("h1,h2,h3,h4,h5,h6")
          .toArray()
          .map((element, index) => ({
            level: Number(element.tagName.replace("h", "")) as
              | 1
              | 2
              | 3
              | 4
              | 5
              | 6,
            text: $(element).text().replace(/\s+/g, " ").trim(),
            order: index + 1,
          }))
          .filter((heading) => heading.text);
        let internalLinksCount = 0;
        let externalLinksCount = 0;

        $("a[href]").each((_, element) => {
          const href = $(element).attr("href");
          if (!href || href.startsWith("#")) return;

          let targetUrl: string;

          try {
            targetUrl = normalizeUrl(new URL(href, pageUrl).toString());
          } catch {
            return;
          }

          if (!["http:", "https:"].includes(new URL(targetUrl).protocol)) {
            return;
          }

          const isInternal = isInternalUrl(targetUrl, domain);
          if (isInternal) {
            internalLinksCount += 1;
          } else {
            externalLinksCount += 1;
          }

          links.set(`${pageUrl}::${targetUrl}`, {
            page_url: pageUrl,
            url: targetUrl,
            anchor_text: $(element).text().replace(/\s+/g, " ").trim() || null,
            is_internal: isInternal,
            status_code: null,
            final_url: null,
            redirect_chain: [],
            redirect_hop_count: 0,
            type: "anchor",
          });
        });

        const imageElements = $("img");
        const imagesCount = imageElements.length;
        const imagesMissingAltCount = imageElements
          .toArray()
          .filter((element) => !$(element).attr("alt")?.trim()).length;
        const keywordDensity = getKeywordDensity(bodyText);
        const wordCount = getWordCount(bodyText);
        const contentFingerprint = getContentFingerprint(bodyText);
        const contentGaps = analyzeContentGaps({
          text: bodyText,
          wordCount,
          title,
          metaDescription: description,
          headingsCount: headings.length,
          headings: headings.map((heading) => heading.text),
          internalLinksCount,
          imageCount: imagesCount,
          keywordDensity,
        });
        const contentQuality = withContentGapsMetric(analyzeContentQuality({
          text: bodyText,
          wordCount,
          title,
          metaDescription: description,
          headingsCount: headings.length,
          internalLinksCount,
          imageCount: imagesCount,
          imagesMissingAltCount,
          keywordDensity,
        }), contentGaps);

        pages.set(pageUrl, {
          url: pageUrl,
          normalized_url: pageUrl,
          status_code: response.statusCode ?? null,
          meta: {
            title,
            description,
            h1,
            canonical,
            viewport,
          },
          content: {
            word_count: wordCount,
            keyword_density: keywordDensity,
            content_quality: contentQuality,
            content_gaps: contentGaps,
            content_fingerprint: contentFingerprint,
            headings,
          },
          links: {
            internal: internalLinksCount,
            external: externalLinksCount,
          },
          images: {
            count: imagesCount,
            missing_alt: imagesMissingAltCount,
          },
          checks: {
            noindex: robots.toLowerCase().includes("noindex"),
            mobile_friendly: hasMobileViewport && !preventsZoom,
          },
        });

        await enqueueLinks({
          exclude: [
            '**/*.jpg',
            '**/*.jpeg',
            '**/*.png',
            '**/*.gif',
            '**/*.webp',
            '**/*.svg',
            '**/*.pdf'
          ],
          strategy: "same-domain",
          transformRequestFunction: (linkRequest) => {
            try {
              const url = new URL(linkRequest.url);
              const normalizedDomain = url.hostname
                .replace(/^www\./i, "")
                .toLowerCase();

              if (normalizedDomain !== domain) {
                return false;
              }
            } catch {
              return false;
            }

            return linkRequest;
          },
        });

      },
      failedRequestHandler({ request, error }) {
        failedRequests.push(
          `${request.url}: ${error instanceof Error ? error.message : "request failed"}`,
        );
      },
    },
    configuration,
  );

  await crawler.run([startUrl]);

  const linkResults = Array.from(links.values());
  const linkStatusCheckLimit = getLinkStatusCheckLimit();
  const linksToCheck = linkResults
    .slice()
    .sort((a, b) => Number(b.is_internal) - Number(a.is_internal))
    .slice(0, linkStatusCheckLimit);

  await checkLinksWithLimit(linksToCheck, 10);

  const pageItems = Array.from(pages.values());

  if (!pageItems.length) {
    throw new Error(
      failedRequests.length
        ? `Crawlee finished without pages. ${failedRequests.slice(0, 3).join("; ")}`
        : "Crawlee finished without pages. Check the website URL, robots rules, DNS, or network access.",
    );
  }

  const missingTitleCount = pageItems.filter((page) => !page.meta.title).length;
  const missingDescriptionCount = pageItems.filter(
    (page) => !page.meta.description,
  ).length;
  const missingH1Count = pageItems.filter((page) => !page.meta.h1).length;
  const missingAltTextCount = pageItems.reduce(
    (total, page) => total + page.images.missing_alt,
    0,
  );
  const brokenLinksCount = linkResults.filter(
    (link) => (link.status_code ?? 200) >= 400,
  ).length;
  const redirectsCount = linkResults.filter(
    (link) => link.redirect_hop_count > 0,
  ).length;

  const summaryRaw = {
    provider: "crawlee",
    tasks: [
      {
        result: [
          {
            crawl_progress: {
              pages_crawled: pageItems.length,
              pages_in_queue: 0,
              status: "finished",
            },
            checks: {
              no_title: missingTitleCount,
              no_description: missingDescriptionCount,
              no_h1: missingH1Count,
              images_without_alt: missingAltTextCount,
              broken_links: brokenLinksCount,
              redirect: redirectsCount,
              redirect_chains: redirectsCount,
            },
          },
        ],
      },
    ],
  };
  const pagesRaw = {
    provider: "crawlee",
    tasks: [
      {
        result: [
          {
            items: pageItems,
          },
        ],
      },
    ],
  };
  const linksRaw = {
    provider: "crawlee",
    tasks: [
      {
        result: [
          {
            items: linkResults,
          },
        ],
      },
    ],
  };

  return {
    summaryRaw,
    pagesRaw,
    linksRaw,
  };
};

const crawleeClient = {
  runCrawl: runCrawleeCrawl,
};

export { crawleeClient };
