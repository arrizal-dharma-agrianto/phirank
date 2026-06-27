import { getActiveTenantHeaders } from "@/modules/tenant/utils/active-tenant";

import type { ContentGeneratorInput } from "../schemas";
import type {
  ContentGeneratorDraftDetail,
  ContentGeneratorDraftFilterStatus,
  ContentGeneratorDrafts,
  ContentGeneratorDraftSortBy,
  ContentGeneratorDraftSortOrder,
  ContentGeneratorIndexNowResponse,
  ContentGeneratorIntegration,
  CreatedContentGeneratorIntegration,
  GeneratedContent,
  PublishedContentDelivery,
} from "../types";

const generateContent = async (
  input: ContentGeneratorInput,
): Promise<GeneratedContent> => {
  const res = await fetch("/api/content-generator", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getActiveTenantHeaders(),
    },
    body: JSON.stringify(input),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message ?? "Failed to generate content.");
  }

  return data;
};

const getContentGeneratorIntegrations = async (): Promise<
  ContentGeneratorIntegration[]
> => {
  const res = await fetch("/api/content-generator/integrations", {
    headers: getActiveTenantHeaders(),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message ?? "Failed to fetch integrations.");
  }

  return data;
};

const getContentGeneratorDrafts = async (
  query: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: ContentGeneratorDraftFilterStatus;
    sortBy?: ContentGeneratorDraftSortBy;
    sortOrder?: ContentGeneratorDraftSortOrder;
  } = {},
): Promise<ContentGeneratorDrafts> => {
  const searchParams = new URLSearchParams();

  if (query.page) searchParams.set("page", String(query.page));
  if (query.pageSize) searchParams.set("pageSize", String(query.pageSize));
  if (query.search) searchParams.set("search", query.search);
  if (query.status) searchParams.set("status", query.status);
  if (query.sortBy) searchParams.set("sortBy", query.sortBy);
  if (query.sortOrder) searchParams.set("sortOrder", query.sortOrder);

  const queryString = searchParams.toString();
  const res = await fetch(
    `/api/content-generator/drafts${queryString ? `?${queryString}` : ""}`,
    {
      headers: getActiveTenantHeaders(),
    },
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message ?? "Failed to fetch generated drafts.");
  }

  return data;
};

const getContentGeneratorDraft = async (
  draftId: string,
): Promise<ContentGeneratorDraftDetail> => {
  const res = await fetch(
    `/api/content-generator/drafts/${encodeURIComponent(draftId)}`,
    {
      headers: getActiveTenantHeaders(),
    },
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message ?? "Failed to fetch generated draft.");
  }

  return data;
};

const deleteContentGeneratorDraft = async (draftId: string): Promise<void> => {
  const res = await fetch(
    `/api/content-generator/drafts/${encodeURIComponent(draftId)}`,
    {
      method: "DELETE",
      headers: getActiveTenantHeaders(),
    },
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message ?? "Failed to delete generated draft.");
  }
};

const createContentGeneratorIntegration = async (input: {
  name: string;
  webhookUrl: string;
}): Promise<CreatedContentGeneratorIntegration> => {
  const res = await fetch("/api/content-generator/integrations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getActiveTenantHeaders(),
    },
    body: JSON.stringify(input),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message ?? "Failed to create integration.");
  }

  return data;
};

const deleteContentGeneratorIntegration = async (
  integrationId: string,
): Promise<void> => {
  const res = await fetch(
    `/api/content-generator/integrations/${encodeURIComponent(integrationId)}`,
    {
      method: "DELETE",
      headers: getActiveTenantHeaders(),
    },
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message ?? "Failed to delete integration.");
  }
};

const getContentGeneratorIndexNow =
  async (): Promise<ContentGeneratorIndexNowResponse> => {
    const res = await fetch("/api/content-generator/indexnow", {
      headers: getActiveTenantHeaders(),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message ?? "Failed to fetch IndexNow settings.");
    }

    return data;
  };

const updateContentGeneratorIndexNow = async (
  action: "enable" | "verify" | "refresh",
): Promise<ContentGeneratorIndexNowResponse> => {
  const res = await fetch("/api/content-generator/indexnow", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getActiveTenantHeaders(),
    },
    body: JSON.stringify({ action }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message ?? "Failed to update IndexNow settings.");
  }

  return data;
};

const publishGeneratedContent = async (input: {
  integrationId: string;
  contentId?: string;
  content: string;
  model?: string;
  source: ContentGeneratorInput;
  submitToIndexNow?: boolean;
}): Promise<PublishedContentDelivery> => {
  const res = await fetch("/api/content-generator/publish", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getActiveTenantHeaders(),
    },
    body: JSON.stringify(input),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message ?? "Failed to publish content.");
  }

  return data;
};

export {
  createContentGeneratorIntegration,
  deleteContentGeneratorDraft,
  deleteContentGeneratorIntegration,
  generateContent,
  getContentGeneratorDraft,
  getContentGeneratorDrafts,
  getContentGeneratorIndexNow,
  getContentGeneratorIntegrations,
  publishGeneratedContent,
  updateContentGeneratorIndexNow,
};
