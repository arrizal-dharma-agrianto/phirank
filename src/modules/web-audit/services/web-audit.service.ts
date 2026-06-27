import { getActiveTenantHeaders } from "@/modules/tenant/utils/active-tenant";

import type { WebAuditInput } from "../schemas";
import type { WebAuditResult } from "../types";

const createWebAudit = async (
  input: WebAuditInput = {},
): Promise<WebAuditResult> => {
  const res = await fetch("/api/web-audits", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getActiveTenantHeaders(),
    },
    body: JSON.stringify(input),
  });

  const data = await res.json();

  if (!res.ok && res.status !== 422) {
    throw new Error(data.message ?? "Failed to run website audit.");
  }

  return data;
};

const getWebAudits = async (): Promise<WebAuditResult[]> => {
  const res = await fetch("/api/web-audits", {
    headers: getActiveTenantHeaders(),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message ?? "Failed to fetch website audits.");
  }

  return data;
};

const getWebAudit = async (auditId: string): Promise<WebAuditResult> => {
  const res = await fetch(`/api/web-audits/${encodeURIComponent(auditId)}`, {
    headers: getActiveTenantHeaders(),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message ?? "Failed to fetch website audit.");
  }

  return data;
};

const deleteWebAudit = async (auditId: string): Promise<void> => {
  const res = await fetch(`/api/web-audits/${encodeURIComponent(auditId)}`, {
    method: "DELETE",
    headers: getActiveTenantHeaders(),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message ?? "Failed to delete website audit.");
  }
};

export { createWebAudit, deleteWebAudit, getWebAudit, getWebAudits };
