import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";
import {
  analyzeContentGaps,
  analyzeContentQuality,
  getContentFingerprint,
  getKeywordDensity,
  withContentGapsMetric,
  withDuplicateContentMetric,
} from "@/modules/data-audit-crawler/utils";

type ProcessCrawlResultInput = {
  websiteId: string;
  crawlJobId: string;
  summaryRaw: unknown;
  pagesRaw: unknown;
  linksRaw: unknown;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const getNested = (value: unknown, path: string[]) => {
  return path.reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[key];
  }, value);
};

const asString = (value: unknown): string | null => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return null;
};

const asNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
    return Number(value);
  }

  return null;
};

const asBoolean = (value: unknown): boolean | null => {
  if (typeof value === "boolean") return value;
  return null;
};

const toJson = (value: unknown) => JSON.stringify(value ?? null);

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map(asString).filter((item): item is string => Boolean(item));
};

const asHeadingStructure = (value: unknown) => {
  if (!Array.isArray(value)) return null;

  return value
    .map((item, index) => {
      const record = asRecord(item);
      const level = asNumber(record.level);
      const text = asString(record.text);

      if (!level || level < 1 || level > 6 || !text) {
        return null;
      }

      return {
        level,
        text,
        order: asNumber(record.order) ?? index + 1,
      };
    })
    .filter(
      (
        heading,
      ): heading is {
        level: number;
        text: string;
        order: number;
      } => Boolean(heading),
    );
};

const asKeywordDensity = (value: unknown) => {
  if (!Array.isArray(value)) return null;

  const items = value
    .map((item) => {
      const record = asRecord(item);
      const keyword = asString(record.keyword);
      const occurrences = asNumber(record.occurrences);
      const density = asNumber(record.density);

      if (!keyword || !occurrences || density === null) {
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

  return items.length ? items : null;
};

const asContentAudit = (value: unknown) => {
  const record = asRecord(value);
  const score = asNumber(record.score);
  const wordCount = asNumber(record.wordCount) ?? asNumber(record.word_count);
  const thinContent =
    asBoolean(record.thinContent) ?? asBoolean(record.thin_content);

  if (score === null || wordCount === null || thinContent === null) {
    return null;
  }

  return {
    score,
    wordCount,
    thinContent,
    metrics: Array.isArray(record.metrics) ? record.metrics : [],
  };
};

const asContentGaps = (value: unknown) => {
  if (!Array.isArray(value)) return null;

  const gaps = value
    .map((item) => {
      const record = asRecord(item);
      const key = asString(record.key);
      const label = asString(record.label);
      const severity = asString(record.severity);
      const recommendation = asString(record.recommendation);

      if (
        !key ||
        ![
          "insufficientDepth",
          "missingSubtopics",
          "missingMetadataContext",
          "missingInternalLinks",
          "missingMediaSupport",
          "weakTopicCoverage",
        ].includes(key) ||
        !label ||
        !["Low", "Medium", "High"].includes(severity ?? "") ||
        !recommendation
      ) {
        return null;
      }

      return {
        key: key as
          | "insufficientDepth"
          | "missingSubtopics"
          | "missingMetadataContext"
          | "missingInternalLinks"
          | "missingMediaSupport"
          | "weakTopicCoverage",
        label,
        severity: severity as "Low" | "Medium" | "High",
        recommendation,
      };
    })
    .filter(
      (
        gap,
      ): gap is {
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
      } => Boolean(gap),
    );

  return gaps.length ? gaps : null;
};

const asDuplicateContent = (value: unknown) => {
  const record = asRecord(value);
  const checked = asBoolean(record.checked);
  const isDuplicate = asBoolean(record.isDuplicate) ?? asBoolean(record.is_duplicate);
  const matchCount = asNumber(record.matchCount) ?? asNumber(record.match_count);
  const matches = Array.isArray(record.matches)
    ? record.matches
        .map((item) => {
          const match = asRecord(item);
          const url = asString(match.url);

          if (!url) return null;

          return {
            url,
            title: asString(match.title),
          };
        })
        .filter((item): item is { url: string; title: string | null } =>
          Boolean(item),
        )
    : [];

  if (checked === null || isDuplicate === null || matchCount === null) {
    return null;
  }

  return {
    checked,
    isDuplicate,
    matchCount,
    matches,
  };
};

const getFirstResult = (raw: unknown) => {
  const task = Array.isArray(asRecord(raw).tasks)
    ? (asRecord(raw).tasks as unknown[])[0]
    : null;
  const result = Array.isArray(asRecord(task).result)
    ? (asRecord(task).result as unknown[])[0]
    : null;

  return asRecord(result);
};

const getItems = (raw: unknown): Record<string, unknown>[] => {
  const result = getFirstResult(raw);
  const items = result.items;

  if (!Array.isArray(items)) {
    return [];
  }

  return items.map(asRecord);
};

const findNumber = (
  source: Record<string, unknown>,
  candidates: string[],
  fallback = 0,
) => {
  for (const candidate of candidates) {
    const value = asNumber(getNested(source, candidate.split(".")));

    if (value !== null) {
      return value;
    }
  }

  return fallback;
};

const isTargetInternal = (targetUrl: string | null, websiteDomain: string) => {
  if (!targetUrl) return false;

  try {
    return new URL(targetUrl).hostname.includes(websiteDomain);
  } catch {
    return targetUrl.startsWith("/") || targetUrl.includes(websiteDomain);
  }
};

const extractPage = (item: Record<string, unknown>) => {
  const meta = asRecord(item.meta);
  const checks = asRecord(item.checks);
  const content = asRecord(item.content);
  const links = asRecord(item.links);
  const images = asRecord(item.images);
  const pageUrl = asString(item.url) ?? asString(item.page_url);
  const bodyText =
    asString(content.plain_text) ??
    asString(content.text) ??
    asString(item.plain_text) ??
    asString(item.body_text);
  const keywordDensity =
    asKeywordDensity(content.keyword_density) ??
    asKeywordDensity(item.keyword_density) ??
    (bodyText ? getKeywordDensity(bodyText) : []);
  const wordCount =
    asNumber(content.plain_text_word_count) ??
    asNumber(item.word_count) ??
    asNumber(content.word_count);
  const headingStructure =
    asHeadingStructure(item.heading_structure) ??
    asHeadingStructure(content.headings) ??
    [];
  const contentFingerprint =
    asString(content.content_fingerprint) ??
    asString(item.content_fingerprint) ??
    (bodyText ? getContentFingerprint(bodyText) : null);
  const contentAudit =
    asContentAudit(content.content_quality) ??
    asContentAudit(item.content_quality) ??
    analyzeContentQuality({
      text: bodyText,
      wordCount,
      title: asString(meta.title) ?? asString(item.title),
      metaDescription:
        asString(meta.description) ?? asString(item.meta_description),
      headingsCount: headingStructure.length,
      internalLinksCount:
        asNumber(links.internal) ?? asNumber(item.internal_links_count),
      imageCount: asNumber(images.count) ?? asNumber(item.images_count),
      imagesMissingAltCount:
        asNumber(images.missing_alt) ??
        asNumber(item.images_missing_alt_count) ??
        findNumber(checks, ["images_without_alt"], 0),
      keywordDensity,
    });
  const contentGaps =
    asContentGaps(content.content_gaps) ??
    asContentGaps(item.content_gaps) ??
    analyzeContentGaps({
      text: bodyText,
      wordCount,
      title: asString(meta.title) ?? asString(item.title),
      metaDescription:
        asString(meta.description) ?? asString(item.meta_description),
      headingsCount: headingStructure.length,
      headings: headingStructure.map((heading) => heading.text),
      internalLinksCount:
        asNumber(links.internal) ?? asNumber(item.internal_links_count),
      imageCount: asNumber(images.count) ?? asNumber(item.images_count),
      keywordDensity,
    });

  return {
    url: pageUrl,
    normalizedUrl:
      asString(item.normalized_url) ?? asString(item.url_normalized) ?? pageUrl,
    statusCode: asNumber(item.status_code),
    title: asString(meta.title) ?? asString(item.title),
    metaDescription:
      asString(meta.description) ?? asString(item.meta_description),
    h1:
      asString(meta.h1) ??
      (Array.isArray(meta.h1) ? asString(meta.h1[0]) : null) ??
      asString(item.h1),
    wordCount,
    internalLinksCount:
      asNumber(links.internal) ?? asNumber(item.internal_links_count),
    externalLinksCount:
      asNumber(links.external) ?? asNumber(item.external_links_count),
    imagesCount: asNumber(images.count) ?? asNumber(item.images_count),
    imagesMissingAltCount:
      asNumber(images.missing_alt) ??
      asNumber(item.images_missing_alt_count) ??
      findNumber(checks, ["images_without_alt"], 0),
    isIndexable:
      asBoolean(item.is_indexable) ??
      (asBoolean(checks.noindex) === null ? null : !asBoolean(checks.noindex)),
    isMobileFriendly:
      asBoolean(item.is_mobile_friendly) ?? asBoolean(checks.mobile_friendly),
    canonicalUrl: asString(meta.canonical) ?? asString(item.canonical_url),
    headingStructure,
    keywordDensity,
    contentAudit: withContentGapsMetric(contentAudit, contentGaps),
    contentGaps,
    contentFingerprint,
    duplicateContent:
      asDuplicateContent(content.duplicate_content) ??
      asDuplicateContent(item.duplicate_content),
  };
};

const attachDuplicateContentAudit = (
  pages: ReturnType<typeof extractPage>[],
) => {
  const pagesByFingerprint = new Map<string, typeof pages>();

  for (const page of pages) {
    if (!page.contentFingerprint) continue;

    const group = pagesByFingerprint.get(page.contentFingerprint) ?? [];
    group.push(page);
    pagesByFingerprint.set(page.contentFingerprint, group);
  }

  return pages.map((page) => {
    if (page.duplicateContent) {
      return {
        ...page,
        contentAudit: withDuplicateContentMetric(
          page.contentAudit,
          page.duplicateContent,
        ),
      };
    }

    const duplicateGroup = page.contentFingerprint
      ? pagesByFingerprint.get(page.contentFingerprint) ?? []
      : [];
    const matches = duplicateGroup
      .filter((candidate) => candidate.url !== page.url)
      .map((candidate) => ({
        url: candidate.url ?? "",
        title: candidate.title,
      }))
      .filter((candidate) => candidate.url);
    const duplicateContent = {
      checked: Boolean(page.contentFingerprint),
      isDuplicate: matches.length > 0,
      matchCount: matches.length,
      matches,
    };

    return {
      ...page,
      duplicateContent,
      contentAudit: withDuplicateContentMetric(
        page.contentAudit,
        duplicateContent,
      ),
    };
  });
};

const extractLink = (item: Record<string, unknown>, websiteDomain: string) => {
  const sourceUrl = asString(item.page_url) ?? asString(item.source_url);
  const targetUrl = asString(item.url) ?? asString(item.target_url);
  const statusCode = asNumber(item.status_code);
  const isInternal =
    asBoolean(item.is_internal) ??
    isTargetInternal(targetUrl, websiteDomain);

  return {
    sourceUrl,
    targetUrl,
    anchorText: asString(item.anchor_text) ?? asString(item.anchor),
    isInternal,
    isExternal: !isInternal,
    isBroken: (statusCode ?? 200) >= 400,
    statusCode,
    linkType: asString(item.type) ?? asString(item.link_type),
    finalUrl: asString(item.final_url),
    redirectChain: asStringArray(item.redirect_chain),
    redirectHopCount: asNumber(item.redirect_hop_count) ?? 0,
  };
};

const processCrawlResult = async ({
  websiteId,
  crawlJobId,
  summaryRaw,
  pagesRaw,
  linksRaw,
}: ProcessCrawlResultInput) => {
  const websites = await prisma.$queryRaw<{ domain: string }[]>`
    SELECT domain
    FROM websites
    WHERE id = ${websiteId}
    LIMIT 1
  `;
  const websiteDomain = websites[0]?.domain ?? "";
  const summary = getFirstResult(summaryRaw);
  const pages = attachDuplicateContentAudit(
    getItems(pagesRaw).map(extractPage).filter((page) => page.url),
  );
  const links = getItems(linksRaw)
    .map((item) => extractLink(item, websiteDomain))
    .filter((link) => link.sourceUrl && link.targetUrl);

  await prisma.$executeRaw`
    DELETE FROM crawl_pages
    WHERE crawl_job_id = ${crawlJobId}
  `;
  await prisma.$executeRaw`
    DELETE FROM crawl_links
    WHERE crawl_job_id = ${crawlJobId}
  `;
  await prisma.$executeRaw`
    DELETE FROM crawl_summaries
    WHERE crawl_job_id = ${crawlJobId}
  `;

  for (const page of pages) {
    await prisma.$executeRaw`
      INSERT INTO crawl_pages (
        id,
        website_id,
        crawl_job_id,
        url,
        normalized_url,
        status_code,
        title,
        meta_description,
        h1,
        word_count,
        internal_links_count,
        external_links_count,
        images_count,
        images_missing_alt_count,
        is_indexable,
        is_mobile_friendly,
        canonical_url,
        heading_structure,
        raw_metrics,
        created_at,
        updated_at
      )
      VALUES (
        ${randomUUID()},
        ${websiteId},
        ${crawlJobId},
        ${page.url},
        ${page.normalizedUrl},
        ${page.statusCode},
        ${page.title},
        ${page.metaDescription},
        ${page.h1},
        ${page.wordCount},
        ${page.internalLinksCount},
        ${page.externalLinksCount},
        ${page.imagesCount},
        ${page.imagesMissingAltCount},
        ${page.isIndexable},
        ${page.isMobileFriendly},
        ${page.canonicalUrl},
        ${toJson(page.headingStructure)}::jsonb,
        ${toJson(page)}::jsonb,
        NOW(),
        NOW()
      )
      ON CONFLICT (crawl_job_id, url) DO NOTHING
    `;
  }

  for (const link of links) {
    await prisma.$executeRaw`
      INSERT INTO crawl_links (
        id,
        website_id,
        crawl_job_id,
        source_url,
        target_url,
        anchor_text,
        is_internal,
        is_external,
        is_broken,
        status_code,
        link_type,
        final_url,
        redirect_chain,
        redirect_hop_count,
        raw_data,
        created_at
      )
      VALUES (
        ${randomUUID()},
        ${websiteId},
        ${crawlJobId},
        ${link.sourceUrl},
        ${link.targetUrl},
        ${link.anchorText},
        ${link.isInternal},
        ${link.isExternal},
        ${link.isBroken},
        ${link.statusCode},
        ${link.linkType},
        ${link.finalUrl},
        ${toJson(link.redirectChain)}::jsonb,
        ${link.redirectHopCount},
        ${toJson(link)}::jsonb,
        NOW()
      )
    `;
  }

  const missingTitleCount =
    findNumber(summary, ["checks.no_title", "checks.title_missing"]) ||
    pages.filter((page) => !page.title).length;
  const missingMetaDescriptionCount =
    findNumber(summary, [
      "checks.no_description",
      "checks.meta_description_missing",
    ]) || pages.filter((page) => !page.metaDescription).length;
  const missingH1Count =
    findNumber(summary, ["checks.no_h1", "checks.h1_missing"]) ||
    pages.filter((page) => !page.h1).length;
  const missingAltTextCount =
    findNumber(summary, ["checks.images_without_alt", "images.missing_alt"]) ||
    pages.reduce((total, page) => total + (page.imagesMissingAltCount ?? 0), 0);
  const brokenLinksCount =
    findNumber(summary, ["checks.broken_links", "broken_links"]) ||
    links.filter((link) => link.isBroken).length;
  const redirectsCount =
    findNumber(summary, ["checks.redirect_chains", "checks.redirect", "redirects"]) ||
    links.filter((link) => link.redirectHopCount > 0).length;
  const crawledPages =
    findNumber(summary, ["crawl_progress.pages_crawled", "pages_crawled"]) ||
    pages.length;
  const totalPages =
    findNumber(summary, ["crawl_progress.pages_in_queue", "pages_in_queue"]) ||
    crawledPages;

  await prisma.$executeRaw`
    INSERT INTO crawl_summaries (
      id,
      website_id,
      crawl_job_id,
      total_pages,
      crawled_pages,
      broken_links_count,
      redirects_count,
      missing_title_count,
      missing_meta_description_count,
      missing_h1_count,
      missing_alt_text_count,
      raw_summary,
      created_at
    )
    VALUES (
      ${randomUUID()},
      ${websiteId},
      ${crawlJobId},
      ${totalPages},
      ${crawledPages},
      ${brokenLinksCount},
      ${redirectsCount},
      ${missingTitleCount},
      ${missingMetaDescriptionCount},
      ${missingH1Count},
      ${missingAltTextCount},
      ${toJson(summary)}::jsonb,
      NOW()
    )
    ON CONFLICT (crawl_job_id) DO UPDATE SET
      total_pages = EXCLUDED.total_pages,
      crawled_pages = EXCLUDED.crawled_pages,
      broken_links_count = EXCLUDED.broken_links_count,
      redirects_count = EXCLUDED.redirects_count,
      missing_title_count = EXCLUDED.missing_title_count,
      missing_meta_description_count = EXCLUDED.missing_meta_description_count,
      missing_h1_count = EXCLUDED.missing_h1_count,
      missing_alt_text_count = EXCLUDED.missing_alt_text_count,
      raw_summary = EXCLUDED.raw_summary
  `;
};

export { processCrawlResult };
