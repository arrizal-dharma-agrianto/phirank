import type {
  AuditCategory,
  AuditFinding,
  WebAuditResult,
} from "../types";

type WebAuditRecord = {
  id: string;
  url: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
  progress: number;
  currentStep: string | null;
  overallScore: number;
  categories: unknown;
  findings: unknown;
  errorMessage: string | null;
  createdAt: Date;
};

const isAuditCategoryArray = (value: unknown): value is AuditCategory[] => {
  return (
    Array.isArray(value) &&
    value.every((item) => {
      return (
        typeof item === "object" &&
        item !== null &&
        "key" in item &&
        "label" in item &&
        "score" in item &&
        "summary" in item
      );
    })
  );
};

const isAuditFindingArray = (value: unknown): value is AuditFinding[] => {
  return (
    Array.isArray(value) &&
    value.every((item) => {
      return (
        typeof item === "object" &&
        item !== null &&
        "title" in item &&
        "description" in item &&
        "severity" in item
      );
    })
  );
};

const serializeWebAudit = (audit: WebAuditRecord): WebAuditResult => {
  const categories = isAuditCategoryArray(audit.categories)
    ? audit.categories
    : [];
  const findings = isAuditFindingArray(audit.findings) ? audit.findings : [];

  return {
    id: audit.id,
    url: audit.url,
    status: audit.status,
    progress: audit.progress,
    currentStep: audit.currentStep,
    auditedAt: new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(audit.createdAt),
    createdAt: audit.createdAt.toISOString(),
    errorMessage: audit.errorMessage,
    overallScore: audit.overallScore,
    categories,
    findings,
  };
};

export { serializeWebAudit, type WebAuditRecord };
