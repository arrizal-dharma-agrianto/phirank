type ContentType =
  | "blogArticle"
  | "landingPage"
  | "faqPage"
  | "productDescription";

type ContentTone =
  | "conversational"
  | "trustworthy"
  | "expert"
  | "friendly"
  | "persuasive";

type IndonesianPronounStyle = "kamu" | "anda" | "mixed";

type ContentGeneratorInternalLink = {
  title: string;
  url: string | null;
  description: string | null;
  raw: string;
};

type ContentGeneratorFaqItem = {
  question: string;
  answer: string;
};

type ContentGeneratorStructuredContent = {
  raw: string;
  title: string | null;
  titleOptions: string[];
  description: string | null;
  descriptionOptions: string[];
  slug: string | null;
  slugOptions: string[];
  strategySummary: string | null;
  mainContent: string | null;
  internalLinks: ContentGeneratorInternalLink[];
  imageAltTexts: string[];
  faq: ContentGeneratorFaqItem[];
  seoNotes: string[];
  contentTags: string[];
  sections: Record<string, string | null>;
};

type GeneratedContent = {
  id: string;
  content: string;
  model: string;
  structuredContent: ContentGeneratorStructuredContent;
  status: ContentGeneratorDraftStatus;
  createdAt: string;
};

type ContentGeneratorDraftStatus =
  | "draft"
  | "published"
  | "failed_to_publish";

type ContentGeneratorDraftFilterStatus = ContentGeneratorDraftStatus | "all";

type ContentGeneratorDraftSortBy =
  | "createdAt"
  | "updatedAt"
  | "title"
  | "status"
  | "publishedAt";

type ContentGeneratorDraftSortOrder = "asc" | "desc";

type ContentGeneratorDraftListItem = {
  id: string;
  title: string;
  model: string | null;
  status: ContentGeneratorDraftStatus;
  metaTitle: string | null;
  metaDescription: string | null;
  slug: string | null;
  strategySummary: string | null;
  publishDeliveryId: string | null;
  publishStatusCode: number | null;
  publishError: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ContentGeneratorDraftsPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type ContentGeneratorDrafts = {
  items: ContentGeneratorDraftListItem[];
  pagination: ContentGeneratorDraftsPagination;
};

type ContentGeneratorDraftDetail = ContentGeneratorDraftListItem & {
  content: string;
  structuredContent: ContentGeneratorStructuredContent;
  source: unknown;
};

type ContentGeneratorIntegration = {
  id: string;
  name: string;
  webhookUrl: string;
  createdAt: string;
};

type CreatedContentGeneratorIntegration = ContentGeneratorIntegration & {
  webhookSecret: string;
};

type PublishedContentDelivery = {
  deliveryId: string;
  status: number;
  contentStatus?: ContentGeneratorDraftStatus;
  publishedUrl?: string | null;
  indexNow?: {
    submitted: boolean;
    status: "submitted" | "skipped" | "failed";
    message: string | null;
    submittedUrl: string | null;
  };
};

type IndexNowStatus =
  | "not_enabled"
  | "pending_setup"
  | "key_verified"
  | "ready"
  | "submission_failed";

type ContentGeneratorIndexNow = {
  status: IndexNowStatus;
  key: string | null;
  keyLocation: string | null;
  lastVerifiedAt: string | null;
  lastSubmittedUrl: string | null;
  lastError: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type ContentGeneratorIndexNowWebsite = {
  id: string;
  name: string;
  startUrl: string;
};

type ContentGeneratorIndexNowResponse = {
  indexNow: ContentGeneratorIndexNow;
  website: ContentGeneratorIndexNowWebsite | null;
};

export type {
  ContentGeneratorDraftDetail,
  ContentGeneratorDraftFilterStatus,
  ContentGeneratorFaqItem,
  ContentGeneratorInternalLink,
  ContentGeneratorDrafts,
  ContentGeneratorDraftListItem,
  ContentGeneratorDraftsPagination,
  ContentGeneratorDraftSortBy,
  ContentGeneratorDraftSortOrder,
  ContentGeneratorDraftStatus,
  ContentGeneratorStructuredContent,
  ContentGeneratorIndexNow,
  ContentGeneratorIndexNowResponse,
  ContentGeneratorIndexNowWebsite,
  ContentGeneratorIntegration,
  ContentTone,
  ContentType,
  CreatedContentGeneratorIntegration,
  GeneratedContent,
  IndonesianPronounStyle,
  PublishedContentDelivery,
};
