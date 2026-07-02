"use client";

import {
  ArrowLeftIcon,
  ArrowSquareOutIcon,
  GlobeSimpleIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useActiveTenant } from "@/modules/tenant/hooks";

import { getCrawlerPage } from "../services";
import type {
  ContentGap,
  ContentAuditMetric,
  ContentAuditResult,
  DuplicateContentResult,
  HeadingNode,
  KeywordDensityItem,
} from "../types";

type HeadingTreeNode = HeadingNode & {
  children: HeadingTreeNode[];
};

const getPageStatusClassName = (statusCode: number | null) => {
  if (!statusCode) return "border-gray-200 bg-gray-50 text-gray-600";
  if (statusCode >= 400) return "border-red-200 bg-red-50 text-red-700";
  if (statusCode >= 300) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
};

const mobileFriendlinessLabel = (value: boolean | null) => {
  if (value === null) return "Mobile unknown";
  return value ? "Mobile-friendly" : "Needs mobile review";
};

const getMobileFriendlinessClassName = (value: boolean | null) => {
  if (value === null) return "border-gray-200 bg-gray-50 text-gray-600";
  return value
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-amber-200 bg-amber-50 text-amber-700";
};

const getContentAuditStatusClassName = (status: ContentAuditMetric["status"]) => {
  if (status === "pass") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "review") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-red-200 bg-red-50 text-red-700";
};

const getContentGapSeverityClassName = (severity: ContentGap["severity"]) => {
  if (severity === "High") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (severity === "Medium") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-sky-200 bg-sky-50 text-sky-700";
};

const PageMetric = ({
  label,
  value,
}: {
  label: string;
  value: string | number | null;
}) => (
  <Card className="rounded-lg border border-gray-100 shadow-sm">
    <CardContent className="p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-950">
        {value ?? "-"}
      </p>
    </CardContent>
  </Card>
);

const ContentAuditCard = ({
  audit,
  contentGaps,
  duplicateContent,
}: {
  audit: ContentAuditResult | null;
  contentGaps: ContentGap[];
  duplicateContent: DuplicateContentResult | null;
}) => (
  <Card className="overflow-hidden rounded-lg border border-gray-100 shadow-sm">
    <CardHeader className="border-b border-gray-100 bg-gray-50/60">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-base">Content audit</CardTitle>
          <CardDescription>
            Content quality and thin content signals from page body text.
          </CardDescription>
        </div>
        {audit ? (
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className={cn(
                "rounded-lg",
                audit.thinContent
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700",
              )}
            >
              {audit.thinContent ? "Thin content" : "Content depth ok"}
            </Badge>
            <Badge variant="outline" className="rounded-lg border-gray-200 bg-white text-gray-700">
              Score {audit.score}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "rounded-lg",
                contentGaps.length
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700",
              )}
            >
              {contentGaps.length
                ? `${contentGaps.length} content gap(s)`
                : "No content gaps"}
            </Badge>
            {duplicateContent ? (
              <Badge
                variant="outline"
                className={cn(
                  "rounded-lg",
                  !duplicateContent.checked
                    ? "border-gray-200 bg-gray-50 text-gray-600"
                    : duplicateContent.isDuplicate
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700",
                )}
              >
                {!duplicateContent.checked
                  ? "Duplicate unchecked"
                  : duplicateContent.isDuplicate
                    ? "Duplicate content"
                    : "Unique content"}
              </Badge>
            ) : null}
          </div>
        ) : null}
      </div>
    </CardHeader>
    <CardContent className="p-5">
      {audit ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {audit.metrics.map((metric) => (
            <div
              key={metric.key}
              className="rounded-lg border border-gray-100 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{metric.label}</p>
                  <p className="mt-1 text-xs text-gray-500">{metric.value}</p>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0 rounded-lg capitalize",
                    getContentAuditStatusClassName(metric.status),
                  )}
                >
                  {metric.status}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                {metric.description}
              </p>
            </div>
          ))}
          {duplicateContent?.isDuplicate ? (
            <div className="rounded-lg border border-red-100 bg-red-50/60 p-3 sm:col-span-2">
              <p className="font-medium text-red-700">Duplicate matches</p>
              <div className="mt-2 grid gap-2">
                {duplicateContent.matches.map((match) => (
                  <a
                    key={match.url}
                    href={match.url}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-xs text-red-700 underline-offset-2 hover:underline"
                  >
                    {match.title ? `${match.title} - ${match.url}` : match.url}
                  </a>
                ))}
              </div>
            </div>
          ) : null}
          {contentGaps.length ? (
            <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-3 sm:col-span-2">
              <p className="font-medium text-amber-800">Content gaps</p>
              <div className="mt-3 grid gap-3">
                {contentGaps.map((gap) => (
                  <div
                    key={gap.key}
                    className="rounded-lg border border-amber-100 bg-white p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium text-gray-900">{gap.label}</p>
                      <Badge
                        variant="outline"
                        className={cn(
                          "shrink-0 rounded-lg",
                          getContentGapSeverityClassName(gap.severity),
                        )}
                      >
                        {gap.severity}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      {gap.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-200 p-5 text-sm text-gray-500">
          No content audit data captured for this page. Recrawl to populate
          content quality signals.
        </div>
      )}
    </CardContent>
  </Card>
);

const KeywordDensityTable = ({
  items,
}: {
  items: KeywordDensityItem[];
}) => (
  <Card className="overflow-hidden rounded-lg border border-gray-100 shadow-sm">
    <CardHeader className="border-b border-gray-100 bg-gray-50/60">
      <CardTitle className="text-base">Keyword density</CardTitle>
      <CardDescription>
        Top repeated terms and phrases captured from page body text.
      </CardDescription>
    </CardHeader>
    <CardContent className="p-0">
      {items.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-gray-100 bg-white text-xs text-gray-500">
              <tr>
                <th className="px-5 py-3 font-medium">Keyword</th>
                <th className="px-5 py-3 font-medium">Occurrences</th>
                <th className="px-5 py-3 font-medium">Density</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <tr key={item.keyword}>
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {item.keyword}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {item.occurrences}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {item.density.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-5 text-sm text-gray-500">
          No repeated keyword density data captured for this page.
        </div>
      )}
    </CardContent>
  </Card>
);

const getHeadingLevelClassName = (level: number) => {
  const levelClasses: Record<number, string> = {
    1: "border-gray-950 bg-gray-950 text-white",
    2: "border-sky-200 bg-sky-50 text-sky-700",
    3: "border-emerald-200 bg-emerald-50 text-emerald-700",
    4: "border-amber-200 bg-amber-50 text-amber-700",
    5: "border-violet-200 bg-violet-50 text-violet-700",
    6: "border-gray-200 bg-gray-50 text-gray-600",
  };

  return levelClasses[level] ?? levelClasses[6];
};

const buildHeadingTree = (headings: HeadingNode[]) => {
  const roots: HeadingTreeNode[] = [];
  const stack: HeadingTreeNode[] = [];

  headings.forEach((heading) => {
    const node: HeadingTreeNode = {
      ...heading,
      children: [],
    };

    while (stack.length && stack[stack.length - 1].level >= node.level) {
      stack.pop();
    }

    const parent = stack[stack.length - 1];

    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }

    stack.push(node);
  });

  return roots;
};

const HeadingTree = ({
  nodes,
  depth = 0,
}: {
  nodes: HeadingTreeNode[];
  depth?: number;
}) => (
  <div className={cn("grid gap-2", depth > 0 && "ml-4 border-l border-gray-200 pl-4")}>
    {nodes.map((node) => (
      <div key={`${node.order}-${node.level}-${node.text}`} className="grid gap-2">
        <div
          className={cn(
            "flex min-w-0 items-start gap-3 rounded-lg border p-3",
            getHeadingLevelClassName(node.level),
          )}
        >
          <span className="shrink-0 text-xs font-semibold">H{node.level}</span>
          <p className="min-w-0 break-words text-sm font-medium">
            {node.text}
          </p>
        </div>
        {node.children.length ? (
          <HeadingTree nodes={node.children} depth={depth + 1} />
        ) : null}
      </div>
    ))}
  </div>
);

const getHeadingIssues = (
  headings: {
    level: 1 | 2 | 3 | 4 | 5 | 6;
    text: string;
    order: number;
  }[],
) => {
  const h1Count = headings.filter((heading) => heading.level === 1).length;
  const issues: string[] = [];

  if (h1Count === 0) {
    issues.push("Missing H1");
  } else if (h1Count > 1) {
    issues.push("Multiple H1");
  }

  const hasSkippedLevel = headings.some((heading, index) => {
    if (index === 0) return heading.level > 1;
    return heading.level - headings[index - 1].level > 1;
  });

  if (hasSkippedLevel) {
    issues.push("Skipped heading level");
  }

  return issues;
};

const CrawlPageDetail = ({
  websiteId,
  pageId,
}: {
  websiteId: string;
  pageId: string;
}) => {
  const { activeTenantId } = useActiveTenant();
  const { data: page, isLoading, error } = useQuery({
    queryKey: ["data-audit-crawler-page", activeTenantId, websiteId, pageId],
    queryFn: () => getCrawlerPage(websiteId, pageId),
    enabled: !!activeTenantId,
  });

  if (isLoading) {
    return (
      <div className="mx-auto grid w-full max-w-6xl gap-5">
        <Skeleton className="h-10 w-36 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="mx-auto grid w-full max-w-6xl gap-5">
        <Link
          href={`/dashboard/data-audit-crawler/${encodeURIComponent(websiteId)}`}
          className="inline-flex w-fit items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          Back to crawled pages
        </Link>
        <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {error instanceof Error
            ? error.message
            : "Failed to load crawled page."}
        </div>
      </div>
    );
  }

  const headingStructure = page.headingStructure.length
    ? page.headingStructure
    : page.h1
      ? [{ level: 1 as const, text: page.h1, order: 1 }]
      : [];
  const headingCounts = [1, 2, 3, 4, 5, 6].map((level) => ({
    level,
    count: headingStructure.filter((heading) => heading.level === level).length,
  }));
  const headingIssues = getHeadingIssues(headingStructure);
  const headingTree = buildHeadingTree(headingStructure);

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5">
      <Link
        href={`/dashboard/data-audit-crawler/${encodeURIComponent(websiteId)}`}
        className="inline-flex w-fit items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        Back to crawled pages
      </Link>

      <div className="flex flex-col gap-4 rounded-lg border border-gray-100 bg-white p-5 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
            Crawled page
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-gray-950">
            {page.title ?? "Untitled page"}
          </h2>
          <p className="mt-2 flex items-center gap-2 break-all text-sm text-gray-500">
            <GlobeSimpleIcon aria-hidden="true" className="size-4 shrink-0" />
            {page.url}
          </p>
          {page.websiteName ? (
            <p className="mt-1 text-xs text-gray-400">
              {page.websiteName}
              {page.websiteStartUrl ? ` · ${page.websiteStartUrl}` : ""}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "rounded-lg",
              getPageStatusClassName(page.statusCode),
            )}
          >
            {page.statusCode ?? "No status"}
          </Badge>
          <Badge variant="outline" className="rounded-lg">
            {page.isIndexable === null
              ? "Indexability unknown"
              : page.isIndexable
                ? "Indexable"
                : "Noindex"}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "rounded-lg",
              getMobileFriendlinessClassName(page.isMobileFriendly),
            )}
          >
            {mobileFriendlinessLabel(page.isMobileFriendly)}
          </Badge>
          <Button asChild className="rounded-lg bg-gray-900 text-white hover:bg-gray-800">
            <a href={page.url} target="_blank" rel="noreferrer">
              <ArrowSquareOutIcon aria-hidden="true" className="size-3.5" />
              Go to page
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <PageMetric label="Words" value={page.wordCount} />
        <PageMetric label="Internal links" value={page.internalLinksCount} />
        <PageMetric label="External links" value={page.externalLinksCount} />
        <PageMetric label="Missing alt" value={page.imagesMissingAltCount} />
        <PageMetric
          label="Mobile"
          value={mobileFriendlinessLabel(page.isMobileFriendly)}
        />
      </div>

      <Card className="rounded-lg border border-gray-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Page metadata</CardTitle>
          <CardDescription>
            SEO fields captured during the latest crawl.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 text-sm">
          <div>
            <p className="text-xs text-gray-500">Meta description</p>
            <p className="mt-1 text-gray-700">
              {page.metaDescription ?? "-"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">H1</p>
            <p className="mt-1 text-gray-700">{page.h1 ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Canonical URL</p>
            <p className="mt-1 break-all text-gray-700">
              {page.canonicalUrl ?? "-"}
            </p>
          </div>
        </CardContent>
      </Card>

      <ContentAuditCard
        audit={page.contentAudit}
        contentGaps={page.contentGaps}
        duplicateContent={page.duplicateContent}
      />

      <KeywordDensityTable items={page.keywordDensity} />

      <Card className="overflow-hidden rounded-lg border border-gray-100 shadow-sm">
        <CardHeader className="border-b border-gray-100 bg-gray-50/60">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base">Heading structure</CardTitle>
              <CardDescription>
                On-page SEO outline captured from H1 through H6.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {headingCounts.map((item) => (
                <Badge
                  key={item.level}
                  variant="outline"
                  className="rounded-lg border-gray-200 bg-white text-gray-700"
                >
                  H{item.level}: {item.count}
                </Badge>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 p-5">
          {headingIssues.length ? (
            <div className="flex flex-wrap gap-2">
              {headingIssues.map((issue) => (
                <Badge
                  key={issue}
                  variant="outline"
                  className="rounded-lg border-amber-200 bg-amber-50 text-amber-700"
                >
                  {issue}
                </Badge>
              ))}
            </div>
          ) : headingStructure.length ? (
            <Badge
              variant="outline"
              className="w-fit rounded-lg border-emerald-200 bg-emerald-50 text-emerald-700"
            >
              Clean hierarchy
            </Badge>
          ) : null}

          {headingTree.length ? (
            <HeadingTree nodes={headingTree} />
          ) : (
            <div className="rounded-lg border border-dashed border-gray-200 p-6 text-sm text-gray-500">
              No headings captured for this page. Recrawl to populate the full
              heading outline.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export { CrawlPageDetail };
