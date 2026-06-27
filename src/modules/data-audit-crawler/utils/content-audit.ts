import type {
  ContentGap,
  ContentAuditMetric,
  ContentAuditResult,
  DuplicateContentResult,
  KeywordDensityItem,
} from "../types";

type AnalyzeContentQualityInput = {
  text?: string | null;
  wordCount?: number | null;
  title?: string | null;
  metaDescription?: string | null;
  headingsCount?: number | null;
  internalLinksCount?: number | null;
  imageCount?: number | null;
  imagesMissingAltCount?: number | null;
  keywordDensity?: KeywordDensityItem[];
};

type AnalyzeContentGapsInput = AnalyzeContentQualityInput & {
  headings?: string[];
};

const getTextWordCount = (text: string) => {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean).length;
};

const getAverageSentenceWords = (text: string, wordCount: number) => {
  const sentenceCount = Math.max(
    1,
    text.split(/[.!?]+/).filter((sentence) => sentence.trim()).length,
  );

  return wordCount / sentenceCount;
};

const statusScore = (status: ContentAuditMetric["status"]) => {
  if (status === "pass") return 1;
  if (status === "review") return 0.6;
  return 0;
};

const scoreMetrics = (metrics: ContentAuditMetric[]) => {
  return Math.round(
    (metrics.reduce((total, metric) => total + statusScore(metric.status), 0) /
      metrics.length) *
      100,
  );
};

const getContentFingerprint = (text: string, minWords = 120) => {
  const words =
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .match(/[a-z0-9]+/g) ?? [];

  if (words.length < minWords) return null;

  const normalized = words.join(" ");
  let hash = 2166136261;

  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash.toString(16);
};

const withDuplicateContentMetric = (
  audit: ContentAuditResult,
  duplicateContent: DuplicateContentResult,
): ContentAuditResult => {
  const duplicateMetric: ContentAuditMetric = {
    key: "duplicateContent",
    label: "Duplicate content",
    status: !duplicateContent.checked
      ? "review"
      : duplicateContent.isDuplicate
        ? "fail"
        : "pass",
    value: !duplicateContent.checked
      ? "Not checked"
      : duplicateContent.isDuplicate
        ? `${duplicateContent.matchCount} duplicate page(s)`
        : "No duplicates",
    description: !duplicateContent.checked
      ? "The page body is too short or unavailable for duplicate content comparison."
      : duplicateContent.isDuplicate
        ? "This page has the same normalized body content as another crawled URL."
        : "No matching body content was found in the current crawl.",
  };
  const metrics = [
    ...audit.metrics.filter((metric) => metric.key !== "duplicateContent"),
    duplicateMetric,
  ];

  return {
    ...audit,
    score: scoreMetrics(metrics),
    metrics,
  };
};

const analyzeContentGaps = ({
  text,
  wordCount,
  title,
  metaDescription,
  headingsCount,
  headings = [],
  internalLinksCount,
  imageCount,
  keywordDensity = [],
}: AnalyzeContentGapsInput): ContentGap[] => {
  const normalizedText = text?.replace(/\s+/g, " ").trim() ?? "";
  const totalWords = wordCount ?? getTextWordCount(normalizedText);
  const normalizedHeadings = headings.map((heading) => heading.toLowerCase());
  const hasQuestionCoverage =
    /\b(how|what|why|when|where|who|cara|apa|mengapa|kenapa|bagaimana)\b/i.test(
      normalizedText,
    ) ||
    normalizedHeadings.some((heading) =>
      /\b(how|what|why|faq|cara|apa|mengapa|kenapa|bagaimana)\b/i.test(
        heading,
      ),
    );
  const gaps: ContentGap[] = [];

  if (totalWords < 600) {
    gaps.push({
      key: "insufficientDepth",
      label: "Insufficient content depth",
      severity: totalWords < 300 ? "High" : "Medium",
      recommendation:
        "Add missing context, examples, comparisons, FAQs, or next-step guidance so the page covers the topic more completely.",
    });
  }

  if ((headingsCount ?? 0) < 2 && totalWords >= 300) {
    gaps.push({
      key: "missingSubtopics",
      label: "Missing subtopic sections",
      severity: "Medium",
      recommendation:
        "Break the content into supporting sections that cover related subtopics, objections, use cases, or questions.",
    });
  } else if (!hasQuestionCoverage && totalWords >= 600) {
    gaps.push({
      key: "missingSubtopics",
      label: "Question coverage gap",
      severity: "Low",
      recommendation:
        "Add a section that answers common reader questions around the page topic.",
    });
  }

  if (!title || !metaDescription) {
    gaps.push({
      key: "missingMetadataContext",
      label: "Missing search context",
      severity: "Medium",
      recommendation:
        "Complete the title and meta description so the page has clear search intent framing.",
    });
  }

  if (typeof internalLinksCount === "number" && internalLinksCount === 0) {
    gaps.push({
      key: "missingInternalLinks",
      label: "Missing internal link support",
      severity: "Medium",
      recommendation:
        "Link to related pages to help readers continue the journey and reinforce topic relationships.",
    });
  }

  if (typeof imageCount === "number" && imageCount === 0 && totalWords >= 600) {
    gaps.push({
      key: "missingMediaSupport",
      label: "Missing supporting media",
      severity: "Low",
      recommendation:
        "Consider adding relevant images, diagrams, screenshots, or examples that make the topic easier to understand.",
    });
  }

  if (totalWords >= 300 && keywordDensity.length < 3) {
    gaps.push({
      key: "weakTopicCoverage",
      label: "Weak topical signals",
      severity: "Low",
      recommendation:
        "Add naturally related terms, entities, and supporting phrases so the page covers the topic with more depth.",
    });
  }

  return gaps;
};

const withContentGapsMetric = (
  audit: ContentAuditResult,
  contentGaps: ContentGap[],
): ContentAuditResult => {
  const highSeverityCount = contentGaps.filter(
    (gap) => gap.severity === "High",
  ).length;
  const mediumSeverityCount = contentGaps.filter(
    (gap) => gap.severity === "Medium",
  ).length;
  const gapsMetric: ContentAuditMetric = {
    key: "contentGaps",
    label: "Content gaps",
    status:
      contentGaps.length === 0
        ? "pass"
        : highSeverityCount > 0 || mediumSeverityCount > 1
          ? "fail"
          : "review",
    value: contentGaps.length
      ? `${contentGaps.length} gap(s)`
      : "No priority gaps",
    description: contentGaps.length
      ? "The page is missing supporting coverage that would make the content more complete."
      : "No priority content coverage gaps were detected.",
  };
  const metrics = [
    ...audit.metrics.filter((metric) => metric.key !== "contentGaps"),
    gapsMetric,
  ];

  return {
    ...audit,
    score: scoreMetrics(metrics),
    metrics,
  };
};

const analyzeContentQuality = ({
  text,
  wordCount,
  title,
  metaDescription,
  headingsCount,
  internalLinksCount,
  imageCount,
  imagesMissingAltCount,
  keywordDensity = [],
}: AnalyzeContentQualityInput): ContentAuditResult => {
  const normalizedText = text?.replace(/\s+/g, " ").trim() ?? "";
  const totalWords = wordCount ?? getTextWordCount(normalizedText);
  const averageSentenceWords = normalizedText
    ? getAverageSentenceWords(normalizedText, totalWords)
    : null;
  const topKeyword = keywordDensity[0];

  const metrics: ContentAuditMetric[] = [
    {
      key: "wordCount",
      label: "Thin content",
      status:
        totalWords >= 600 ? "pass" : totalWords >= 300 ? "review" : "fail",
      value: `${totalWords} words`,
      description:
        totalWords >= 600
          ? "The page has enough body copy for a substantive content pass."
          : totalWords >= 300
            ? "The page has moderate copy depth and may need more supporting detail."
            : "The page has too little body copy and is likely thin content.",
    },
    {
      key: "readability",
      label: "Readability",
      status:
        averageSentenceWords === null || averageSentenceWords <= 24
          ? "pass"
          : averageSentenceWords <= 34
            ? "review"
            : "fail",
      value:
        averageSentenceWords === null
          ? "No sentence data"
          : `${averageSentenceWords.toFixed(1)} words/sentence`,
      description:
        averageSentenceWords === null || averageSentenceWords <= 24
          ? "Sentence length is easy to scan."
          : averageSentenceWords <= 34
            ? "Some sentences may be long for quick scanning."
            : "Average sentence length is high and may hurt readability.",
    },
    {
      key: "headingCoverage",
      label: "Heading coverage",
      status:
        (headingsCount ?? 0) > 0 && totalWords / Math.max(1, headingsCount ?? 0) <= 450
          ? "pass"
          : (headingsCount ?? 0) > 0
            ? "review"
            : "fail",
      value: `${headingsCount ?? 0} heading(s)`,
      description:
        (headingsCount ?? 0) > 0
          ? "Headings are present to break up the page body."
          : "Add headings to clarify structure and improve scanability.",
    },
    {
      key: "metadata",
      label: "Content metadata",
      status: title && metaDescription ? "pass" : title || metaDescription ? "review" : "fail",
      value: title && metaDescription ? "Title and description" : "Incomplete",
      description:
        title && metaDescription
          ? "The page has title and meta description context."
          : "Add complete title and meta description context for the content.",
    },
    {
      key: "keywordBalance",
      label: "Keyword balance",
      status:
        !topKeyword || topKeyword.density <= 4.5
          ? "pass"
          : topKeyword.density <= 6
            ? "review"
            : "fail",
      value: topKeyword
        ? `${topKeyword.keyword} (${topKeyword.density.toFixed(2)}%)`
        : "No repeated keyword",
      description:
        !topKeyword || topKeyword.density <= 4.5
          ? "Repeated terms look balanced."
          : "One repeated term or phrase may be too dominant.",
    },
  ];

  if (typeof internalLinksCount === "number") {
    metrics.push({
      key: "internalLinks",
      label: "Internal links",
      status: internalLinksCount > 0 ? "pass" : "review",
      value: `${internalLinksCount} internal link(s)`,
      description:
        internalLinksCount > 0
          ? "Internal links support topic navigation."
          : "Add internal links to related pages where relevant.",
    });
  }

  if (typeof imageCount === "number") {
    metrics.push({
      key: "imageAlt",
      label: "Image alt text",
      status:
        imageCount === 0 || (imagesMissingAltCount ?? 0) === 0
          ? "pass"
          : "review",
      value: `${imagesMissingAltCount ?? 0}/${imageCount} missing alt`,
      description:
        imageCount === 0 || (imagesMissingAltCount ?? 0) === 0
          ? "Images do not add alt text issues to this content pass."
          : "Add descriptive alt text to images that support the page content.",
    });
  }

  return {
    score: scoreMetrics(metrics),
    wordCount: totalWords,
    thinContent: totalWords < 300,
    metrics,
  };
};

export {
  analyzeContentGaps,
  analyzeContentQuality,
  getContentFingerprint,
  withContentGapsMetric,
  withDuplicateContentMetric,
};
