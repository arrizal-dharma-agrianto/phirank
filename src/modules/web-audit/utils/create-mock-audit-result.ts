import type { WebAuditResult } from "../types";

const scoreLabels = [
  "Performance budget looks stable.",
  "Metadata and crawl signals are present.",
  "Core content is readable and structured.",
  "Mobile viewport checks are passing.",
  "Best-practice checks are mostly passing.",
  "Security headers need follow-up.",
  "Content depth and readability look reviewable.",
];

const normalizeUrl = (url: string) => {
  const parsedUrl = new URL(url);

  parsedUrl.hash = "";

  return parsedUrl.toString();
};

const getUrlSeed = (url: string) => {
  return Array.from(url).reduce((total, character) => {
    return total + character.charCodeAt(0);
  }, 0);
};

const getScore = (seed: number, offset: number) => {
  return 68 + ((seed + offset * 13) % 28);
};

const createMockAuditResult = (url: string): WebAuditResult => {
  const normalizedUrl = normalizeUrl(url);
  const seed = getUrlSeed(normalizedUrl);

  const categories = [
    {
      key: "performance",
      label: "Performance",
      score: getScore(seed, 1),
      summary: scoreLabels[0],
    },
    {
      key: "seo",
      label: "SEO",
      score: getScore(seed, 2),
      summary: scoreLabels[1],
    },
    {
      key: "accessibility",
      label: "Accessibility",
      score: getScore(seed, 3),
      summary: scoreLabels[2],
    },
    {
      key: "contentQuality",
      label: "Content Quality",
      score: getScore(seed, 7),
      summary: scoreLabels[6],
    },
    {
      key: "mobileFriendliness",
      label: "Mobile Friendliness",
      score: getScore(seed, 4),
      summary: scoreLabels[3],
    },
    {
      key: "bestPractices",
      label: "Best Practices",
      score: getScore(seed, 5),
      summary: scoreLabels[4],
    },
    {
      key: "security",
      label: "Security",
      score: getScore(seed, 6),
      summary: scoreLabels[5],
    },
  ] satisfies WebAuditResult["categories"];

  const overallScore = Math.round(
    categories.reduce((total, category) => total + category.score, 0) /
      categories.length,
  );

  return {
    url: normalizedUrl,
    auditedAt: new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date()),
    overallScore,
    categories,
    findings: [
      {
        title: "Review page speed opportunities",
        description:
          "Connect Lighthouse or a worker-based audit engine to collect real Core Web Vitals signals.",
        severity: overallScore >= 82 ? "Low" : "Medium",
        category: "performance",
        effort: "Sedang",
        impact: overallScore >= 82 ? "Rendah" : "Sedang",
        priority: overallScore >= 82 ? "Pantau" : "Jadwalkan",
      },
      {
        title: "Validate technical SEO metadata",
        description:
          "Check title tags, descriptions, canonical URL, robots directives, sitemap, and Open Graph tags.",
        severity: "Medium",
        category: "seo",
        effort: "Rendah",
        impact: "Sedang",
        priority: "Jadwalkan",
      },
      {
        title: "Review content depth",
        description:
          "Check word count, readability, headings, internal links, and keyword balance for the audited page.",
        severity: "Medium",
        category: "contentQuality",
        effort: "Sedang",
        impact: "Sedang",
        priority: "Jadwalkan",
      },
      {
        title: "Inspect security headers",
        description:
          "Audit Content-Security-Policy, HSTS, X-Frame-Options, and cookie flags from the target response.",
        severity: "High",
        category: "security",
        effort: "Sedang",
        impact: "Tinggi",
        priority: "Prioritas tinggi",
      },
    ],
  };
};

export { createMockAuditResult };
