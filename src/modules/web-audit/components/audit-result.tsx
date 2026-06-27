"use client";

import {
  ArrowSquareOutIcon,
  CaretDownIcon,
  CheckCircleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { AuditCategory, AuditFinding, WebAuditResult } from "../types";

type AuditResultProps = {
  result: WebAuditResult;
};

const getScoreTone = (score: number) => {
  if (score >= 85) {
    return "text-emerald-600";
  }

  if (score >= 70) {
    return "text-amber-600";
  }

  return "text-red-600";
};

const getSeverityClassName = (severity: string) => {
  if (severity === "High") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (severity === "Medium") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
};

const priorityWeight = {
  Rendah: 1,
  Sedang: 2,
  Tinggi: 3,
} as const;

const getEffortClassName = (effort: AuditFinding["effort"]) => {
  if (effort === "Rendah") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (effort === "Sedang") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-red-200 bg-red-50 text-red-700";
};

const getImpactClassName = (impact: AuditFinding["impact"]) => {
  if (impact === "Tinggi") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (impact === "Sedang") return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-gray-200 bg-gray-50 text-gray-600";
};

const getPriorityClassName = (priority: AuditFinding["priority"]) => {
  if (priority === "Quick win") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (priority === "Prioritas tinggi") return "border-red-200 bg-red-50 text-red-700";
  if (priority === "Jadwalkan") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-gray-200 bg-gray-50 text-gray-600";
};

const findingCategoryLabels: Record<AuditCategory["key"], string> = {
  performance: "Performance",
  seo: "SEO",
  accessibility: "Accessibility",
  mobileFriendliness: "Mobile Friendliness",
  bestPractices: "Best Practices",
  security: "Security",
  contentQuality: "Content Quality",
};

const findingCategoryOrder: AuditCategory["key"][] = [
  "performance",
  "seo",
  "contentQuality",
  "accessibility",
  "mobileFriendliness",
  "bestPractices",
  "security",
];

const inferFindingCategory = (
  finding: AuditFinding,
): AuditCategory["key"] => {
  if (finding.category) return finding.category;

  const content = `${finding.title} ${finding.description}`.toLowerCase();

  if (
    content.includes("speed") ||
    content.includes("response") ||
    content.includes("lcp") ||
    content.includes("fcp") ||
    content.includes("core web vitals")
  ) {
    return "performance";
  }

  if (
    content.includes("seo") ||
    content.includes("title") ||
    content.includes("meta") ||
    content.includes("h1") ||
    content.includes("robots") ||
    content.includes("sitemap") ||
    content.includes("canonical") ||
    content.includes("open graph")
  ) {
    return "seo";
  }

  if (
    content.includes("content") ||
    content.includes("readability") ||
    content.includes("words") ||
    content.includes("keyword density") ||
    content.includes("keyword stuffing")
  ) {
    return "contentQuality";
  }

  if (
    content.includes("mobile") ||
    content.includes("viewport") ||
    content.includes("tap target") ||
    content.includes("font size")
  ) {
    return "mobileFriendliness";
  }

  if (content.includes("accessibility") || content.includes("alt text")) {
    return "accessibility";
  }

  if (
    content.includes("security") ||
    content.includes("content-security-policy") ||
    content.includes("hsts") ||
    content.includes("header") ||
    content.includes("https")
  ) {
    return "security";
  }

  return "bestPractices";
};

const inferEffort = (finding: AuditFinding): NonNullable<AuditFinding["effort"]> => {
  if (finding.effort) return finding.effort;

  const category = inferFindingCategory(finding);
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

  if (category === "security" || category === "performance") {
    return "Sedang";
  }

  if (content.includes("content") || content.includes("lighthouse")) {
    return "Sedang";
  }

  return "Sedang";
};

const inferImpact = (finding: AuditFinding): NonNullable<AuditFinding["impact"]> => {
  if (finding.impact) return finding.impact;
  if (finding.severity === "High") return "Tinggi";
  if (finding.severity === "Medium") return "Sedang";
  return "Rendah";
};

const getFindingPriority = (
  finding: AuditFinding,
): NonNullable<AuditFinding["priority"]> => {
  if (finding.priority) return finding.priority;

  const effort = inferEffort(finding);
  const impact = inferImpact(finding);

  if (impact === "Tinggi" && effort === "Rendah") return "Quick win";
  if (impact === "Tinggi") return "Prioritas tinggi";
  if (impact === "Sedang" && effort !== "Tinggi") return "Jadwalkan";
  return "Pantau";
};

const getFindingPriorityScore = (finding: AuditFinding) => {
  const effort = inferEffort(finding);
  const impact = inferImpact(finding);

  return priorityWeight[impact] * 10 - priorityWeight[effort];
};

const AuditResult = ({ result }: AuditResultProps) => {
  const isFailed = result.status === "FAILED";
  const categoryLabels = new Map(
    result.categories.map((category) => [category.key, category.label]),
  );
  const [openCategories, setOpenCategories] = useState<
    Record<AuditCategory["key"], boolean>
  >(() => {
    return findingCategoryOrder.reduce(
      (state, categoryKey) => ({
        ...state,
        [categoryKey]: true,
      }),
      {} as Record<AuditCategory["key"], boolean>,
    );
  });
  const findingGroups = findingCategoryOrder
    .map((categoryKey) => {
      const findings = result.findings.filter((finding) => {
        return inferFindingCategory(finding) === categoryKey;
      }).sort((a, b) => getFindingPriorityScore(b) - getFindingPriorityScore(a));

      return {
        key: categoryKey,
        label:
          categoryLabels.get(categoryKey) ?? findingCategoryLabels[categoryKey],
        findings,
      };
    })
    .filter((group) => categoryLabels.has(group.key) || group.findings.length > 0);

  const handleCategoryClick = (categoryKey: AuditCategory["key"]) => {
    setOpenCategories((current) => ({
      ...current,
      [categoryKey]: true,
    }));

    window.requestAnimationFrame(() => {
      document
        .getElementById(`priority-findings-${categoryKey}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const toggleCategory = (categoryKey: AuditCategory["key"]) => {
    setOpenCategories((current) => ({
      ...current,
      [categoryKey]: !current[categoryKey],
    }));
  };

  return (
    <div className="grid gap-4">
      <Card className="rounded-lg border border-gray-100 shadow-sm">
        <CardHeader className="gap-3 sm:flex sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Audit result</CardTitle>
              {result.status ? (
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-lg",
                    isFailed
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700",
                  )}
                >
                  {result.status}
                </Badge>
              ) : null}
            </div>
            <CardDescription className="flex items-center gap-1.5 break-all text-xs text-gray-500">
              <ArrowSquareOutIcon aria-hidden="true" className="size-3.5" />
              {result.url}
            </CardDescription>
          </div>

          <div className="text-left sm:text-right">
            <p className={cn("text-3xl font-semibold", getScoreTone(result.overallScore))}>
              {result.overallScore}
            </p>
            <p className="text-xs text-gray-500">Overall score</p>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
            {result.categories.map((category) => (
              <button
                type="button"
                key={category.key}
                className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-left transition-colors hover:border-gray-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
                aria-label={`View ${category.label} priority findings`}
                onClick={() => handleCategoryClick(category.key)}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="font-medium text-gray-900">{category.label}</p>
                  <span className={cn("font-semibold", getScoreTone(category.score))}>
                    {category.score}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-gray-900"
                    style={{ width: `${category.score}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">{category.summary}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-lg border border-gray-100 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <WarningCircleIcon aria-hidden="true" className="size-4 text-amber-500" />
            Priority findings
          </CardTitle>
          <CardDescription>
            Issues detected by the HTTP analyzer for this audit snapshot.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {findingGroups.map((group) => (
              <section
                key={group.key}
                id={`priority-findings-${group.key}`}
                className="scroll-mt-24 rounded-lg border border-gray-100"
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 p-3 text-left"
                  aria-expanded={openCategories[group.key]}
                  aria-controls={`priority-findings-panel-${group.key}`}
                  onClick={() => toggleCategory(group.key)}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <CaretDownIcon
                      aria-hidden="true"
                      className={cn(
                        "size-4 shrink-0 text-gray-400 transition-transform",
                        !openCategories[group.key] && "-rotate-90",
                      )}
                    />
                    <h3 className="truncate text-sm font-semibold text-gray-900">
                      {group.label}
                    </h3>
                  </div>
                  <Badge variant="outline" className="rounded-lg text-gray-500">
                    {group.findings.length}
                  </Badge>
                </button>

                {openCategories[group.key] ? (
                  <div
                    id={`priority-findings-panel-${group.key}`}
                    className="grid gap-3 border-t border-gray-100 p-3"
                  >
                    {group.findings.length ? (
                      group.findings.map((finding, index) => {
                        const effort = inferEffort(finding);
                        const impact = inferImpact(finding);
                        const priority = getFindingPriority(finding);

                        return (
                          <div
                            key={`${group.key}-${finding.title}-${index}`}
                            className="flex flex-col gap-3 rounded-lg border border-gray-100 p-3 sm:flex-row sm:items-start sm:justify-between"
                          >
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium text-gray-900">
                                  {finding.title}
                                </p>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "rounded-lg",
                                    getPriorityClassName(priority),
                                  )}
                                >
                                  {priority}
                                </Badge>
                              </div>
                              <p className="mt-1 text-xs text-gray-500">
                                {finding.description}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "rounded-lg",
                                  getImpactClassName(impact),
                                )}
                              >
                                Dampak {impact}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "rounded-lg",
                                  getEffortClassName(effort),
                                )}
                              >
                                Effort {effort}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "rounded-lg",
                                  getSeverityClassName(finding.severity),
                                )}
                              >
                                {finding.severity}
                              </Badge>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-lg border border-dashed border-gray-200 p-3 text-xs text-gray-500">
                        No priority findings in this category.
                      </div>
                    )}
                  </div>
                ) : null}
              </section>
            ))}
          </div>
        </CardContent>
      </Card>

      <div
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-xs",
          isFailed
            ? "border border-red-100 bg-red-50 text-red-700"
            : "border border-emerald-100 bg-emerald-50 text-emerald-700",
        )}
      >
        {isFailed ? (
          <WarningCircleIcon aria-hidden="true" className="size-4 shrink-0" />
        ) : (
          <CheckCircleIcon aria-hidden="true" className="size-4 shrink-0" />
        )}
        {isFailed
          ? `Audit failed at ${result.auditedAt}. ${result.errorMessage ?? ""}`
          : `Audit completed at ${result.auditedAt}. This result is saved in the active workspace.`}
      </div>
    </div>
  );
};

export { AuditResult };
