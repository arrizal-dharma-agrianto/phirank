type AuditCategory = {
  key:
    | "performance"
    | "seo"
    | "accessibility"
    | "mobileFriendliness"
    | "bestPractices"
    | "security"
    | "contentQuality";
  label: string;
  score: number;
  summary: string;
};

type AuditFinding = {
  title: string;
  description: string;
  severity: "Low" | "Medium" | "High";
  category?: AuditCategory["key"];
  effort?: "Rendah" | "Sedang" | "Tinggi";
  impact?: "Rendah" | "Sedang" | "Tinggi";
  priority?: "Quick win" | "Prioritas tinggi" | "Jadwalkan" | "Pantau";
};

type WebAuditResult = {
  id?: string;
  url: string;
  status?: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
  progress?: number;
  currentStep?: string | null;
  auditedAt: string;
  createdAt?: string;
  errorMessage?: string | null;
  overallScore: number;
  categories: AuditCategory[];
  findings: AuditFinding[];
};

export type { AuditCategory, AuditFinding, WebAuditResult };
