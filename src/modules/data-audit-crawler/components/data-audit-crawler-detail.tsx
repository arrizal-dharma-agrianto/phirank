"use client";

import {
  ArrowLeftIcon,
  ArrowsClockwiseIcon,
  ArrowsDownUpIcon,
  GlobeSimpleIcon,
  MagnifyingGlassIcon,
} from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import {
  getCrawlerWebsite,
  refreshCrawlerWebsiteBacklinks,
  updateCrawlerWebsite,
} from "../services";
import type {
  CrawlPageIndexabilityFilter,
  CrawlPageSortBy,
  CrawlPageStatusFilter,
  CrawlStatus,
} from "../types";

const statusLabel: Record<CrawlStatus, string> = {
  pending: "Menunggu",
  running: "Crawling",
  completed: "Selesai",
  failed: "Gagal",
};

const getStatusClassName = (status: CrawlStatus) => {
  if (status === "completed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "failed") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
};

const formatDate = (value: string | null) => {
  if (!value) return "Not crawled yet";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat("en-US").format(value);
};

const pageSizeOptions = [10, 25, 50, 100] as const;

const mobileFriendlinessLabel = (value: boolean | null) => {
  if (value === null) return "Unknown";
  return value ? "Mobile-friendly" : "Needs review";
};

const getMobileFriendlinessClassName = (value: boolean | null) => {
  if (value === null) return "border-gray-200 bg-gray-50 text-gray-600";
  return value
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-amber-200 bg-amber-50 text-amber-700";
};

const DataAuditCrawlerDetail = ({
  websiteId,
  showBackLink = true,
}: {
  websiteId: string;
  showBackLink?: boolean;
}) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [status, setStatus] = useState<CrawlPageStatusFilter>("all");
  const [indexability, setIndexability] =
    useState<CrawlPageIndexabilityFilter>("all");
  const [sortBy, setSortBy] = useState<CrawlPageSortBy>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const router = useRouter();
  const { data: website, isLoading, error } = useQuery({
    queryKey: [
      "data-audit-crawler-website",
      websiteId,
      page,
      pageSize,
      search,
      status,
      indexability,
      sortBy,
      sortOrder,
    ],
    queryFn: () =>
      getCrawlerWebsite(websiteId, {
        page,
        pageSize,
        search,
        status,
        indexability,
        sortBy,
        sortOrder,
      }),
    refetchInterval: (query) => {
      const status = query.state.data?.crawlStatus;
      return status === "pending" || status === "running" ? 5000 : false;
    },
  });
  const updateMutation = useMutation({
    mutationFn: () => updateCrawlerWebsite(websiteId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["data-audit-crawler-website", websiteId],
      });
      queryClient.invalidateQueries({
        queryKey: ["data-audit-crawler-websites"],
      });
    },
  });
  const backlinkMutation = useMutation({
    mutationFn: () => refreshCrawlerWebsiteBacklinks(websiteId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["data-audit-crawler-website", websiteId],
      });
    },
  });

  const resetToFirstPage = () => setPage(1);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetToFirstPage();
    setSearch(searchDraft.trim());
  };

  const handleSort = (nextSortBy: CrawlPageSortBy) => {
    resetToFirstPage();

    if (sortBy === nextSortBy) {
      setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortBy(nextSortBy);
    setSortOrder("asc");
  };

  if (isLoading) {
    return (
      <div className="mx-auto grid w-full max-w-6xl gap-5">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-72 rounded-lg" />
      </div>
    );
  }

  if (error || !website) {
    return (
      <div className="mx-auto grid w-full max-w-6xl gap-5">
        <Link
          href="/dashboard/data-audit-crawler"
          className="inline-flex w-fit items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          Back to crawler
        </Link>
        <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {error instanceof Error
            ? error.message
            : "Failed to load crawler website."}
        </div>
      </div>
    );
  }

  const isActive =
    website.crawlStatus === "pending" || website.crawlStatus === "running";
  const pagination = website.pagesPagination;
  const firstPageItem =
    pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const lastPageItem = Math.min(
    pagination.total,
    pagination.page * pagination.pageSize,
  );

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5">
      {showBackLink ? (
        <Link
          href="/dashboard/data-audit-crawler"
          className="inline-flex w-fit items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          Back to crawler
        </Link>
      ) : null}

      <div className="flex flex-col gap-3 rounded-lg border border-gray-100 bg-white p-5 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
            Dashboard
          </p>
          <h2 className="mt-2 truncate text-2xl font-semibold tracking-tight text-gray-950">
            {website.name}
          </h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-gray-500">
            <GlobeSimpleIcon aria-hidden="true" className="size-4" />
            {website.startUrl}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            className="rounded-lg bg-gray-900 text-white hover:bg-gray-800"
            disabled={isActive || updateMutation.isPending}
            onClick={() => updateMutation.mutate()}
          >
            <ArrowsClockwiseIcon aria-hidden="true" className="size-3.5" />
            {updateMutation.isPending ? "Starting..." : "Start Crawling"}
          </Button>
        </div>
      </div>

      {updateMutation.error ? (
        <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
          {updateMutation.error.message}
        </div>
      ) : null}

      {website.backlinkProfileEnabled && backlinkMutation.error ? (
        <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
          {backlinkMutation.error.message}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Crawled pages", website.latestSummary?.crawledPages ?? 0],
          ["Broken links", website.latestSummary?.brokenLinksCount ?? 0],
          ["Redirect chains", website.latestSummary?.redirectsCount ?? 0],
          ["Missing title", website.latestSummary?.missingTitleCount ?? 0],
          [
            "Missing meta description",
            website.latestSummary?.missingMetaDescriptionCount ?? 0,
          ],
        ].map(([label, value]) => (
          <Card key={label} className="rounded-lg border border-gray-100 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-gray-950">
                {value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {website.backlinkProfileEnabled ? (
        <Card className="rounded-lg border border-gray-100 shadow-sm">
          <CardHeader className="gap-3 sm:flex sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base">Backlink profile</CardTitle>
              <CardDescription>
                Latest external backlink snapshot for {website.domain}.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-lg sm:w-auto"
              disabled={backlinkMutation.isPending}
              onClick={() => backlinkMutation.mutate()}
            >
              <ArrowsClockwiseIcon aria-hidden="true" className="size-3.5" />
              {backlinkMutation.isPending ? "Refreshing..." : "Refresh backlinks"}
            </Button>
          </CardHeader>
          <CardContent>
            {website.backlinkProfile ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  [
                    "Backlinks",
                    formatNumber(website.backlinkProfile.totalBacklinks),
                  ],
                  [
                    "Referring domains",
                    formatNumber(website.backlinkProfile.referringDomains),
                  ],
                  [
                    "Main domains",
                    formatNumber(website.backlinkProfile.referringMainDomains),
                  ],
                  [
                    "Dofollow",
                    formatNumber(website.backlinkProfile.dofollowBacklinks),
                  ],
                  [
                    "Nofollow",
                    formatNumber(website.backlinkProfile.nofollowBacklinks),
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-lg border border-gray-100 bg-gray-50 p-3"
                  >
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="mt-2 text-2xl font-semibold text-gray-950">
                      {value}
                    </p>
                  </div>
                ))}
                <p className="text-xs text-gray-500 sm:col-span-2 lg:col-span-5">
                  Last refreshed {formatDate(website.backlinkProfile.createdAt)}
                  {" · "}
                  Provider {website.backlinkProfile.provider}
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-200 p-6 text-sm text-gray-500">
                No backlink snapshot yet. Refresh backlinks to fetch the latest
                count from DataForSEO.
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card className="rounded-lg border border-gray-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Crawled pages</CardTitle>
          <CardDescription>
            Last crawled at {formatDate(website.lastCrawledAt)}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <form
                className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-md"
                onSubmit={handleSearch}
              >
                <Input
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  placeholder="Search URL, title, meta, or H1"
                  className="h-9 rounded-lg"
                />
                <Button type="submit" variant="outline" className="rounded-lg">
                  <MagnifyingGlassIcon
                    aria-hidden="true"
                    className="size-3.5"
                  />
                  Search
                </Button>
              </form>

              <div className="flex gap-2">
                <Select
                  value={status}
                  onValueChange={(value) => {
                    resetToFirstPage();
                    setStatus(value as CrawlPageStatusFilter);
                  }}
                >
                  <SelectTrigger className="w-36 rounded-lg">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All status</SelectItem>
                    <SelectItem value="success">2xx success</SelectItem>
                    <SelectItem value="redirect">3xx redirect</SelectItem>
                    <SelectItem value="error">4xx/5xx error</SelectItem>
                    <SelectItem value="unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={indexability}
                  onValueChange={(value) => {
                    resetToFirstPage();
                    setIndexability(value as CrawlPageIndexabilityFilter);
                  }}
                >
                  <SelectTrigger className="w-40 rounded-lg">
                    <SelectValue placeholder="Indexability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All indexability</SelectItem>
                    <SelectItem value="indexable">Indexable</SelectItem>
                    <SelectItem value="noindex">Noindex</SelectItem>
                    <SelectItem value="unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => {
                    resetToFirstPage();
                    setPageSize(Number(value));
                  }}
                >
                  <SelectTrigger className="w-28 rounded-lg">
                    <SelectValue placeholder="Rows" />
                  </SelectTrigger>
                  <SelectContent>
                    {pageSizeOptions.map((option) => (
                      <SelectItem key={option} value={String(option)}>
                        {option} rows
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {website.pages.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    {(
                      [
                        ["url", "URL"],
                        ["statusCode", "Status"],
                        ["title", "Title"],
                        ["wordCount", "Words"],
                        ["missingAlt", "Missing alt"],
                      ] as const
                    ).map(([key, label]) => (
                      <TableHead
                        key={key}
                        className={cn(
                          key === "url" && "min-w-[260px]",
                          key === "title" && "min-w-[220px]",
                        )}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-auto rounded-lg px-0 text-xs font-medium text-gray-500 hover:bg-transparent"
                          onClick={() => handleSort(key)}
                        >
                          {label}
                          <ArrowsDownUpIcon
                            aria-hidden="true"
                            className={cn(
                              "size-3.5",
                              sortBy === key && "text-gray-950",
                            )}
                          />
                          {sortBy === key ? (
                            <span className="text-[10px] uppercase">
                              {sortOrder}
                            </span>
                          ) : null}
                        </Button>
                      </TableHead>
                    ))}
                    <TableHead className="min-w-[150px] text-xs font-medium text-gray-500">
                      Mobile
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {website.pages.map((page) => (
                    <TableRow
                      key={page.id}
                      className="cursor-pointer"
                      onClick={() =>
                        router.push(
                          `/dashboard/data-audit-crawler/${encodeURIComponent(
                            website.id,
                          )}/pages/${encodeURIComponent(page.id)}`,
                        )
                      }
                    >
                      <TableCell className="max-w-[260px] truncate font-medium text-gray-900">
                        {page.url}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {page.statusCode ?? "-"}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-gray-600">
                        {page.title ?? "-"}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {page.wordCount ?? "-"}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {page.imagesMissingAltCount ?? "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-lg",
                            getMobileFriendlinessClassName(
                              page.isMobileFriendly,
                            ),
                          )}
                        >
                          {mobileFriendlinessLabel(page.isMobileFriendly)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
                {isActive
                  ? "Crawl sedang berjalan. Hasil halaman akan muncul setelah crawler selesai memproses task."
                  : "No crawled pages match the current filters."}
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
              <p>
                Showing {firstPageItem}-{lastPageItem} of {pagination.total}{" "}
                pages
                {search ? ` for "${search}"` : ""}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-lg"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </Button>
                <span className="min-w-24 text-center text-xs">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-lg"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() =>
                    setPage((current) =>
                      Math.min(pagination.totalPages, current + 1),
                    )
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-lg border border-gray-100 shadow-sm">
        <CardHeader className="gap-3 sm:flex sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">Crawl job history</CardTitle>
            <CardDescription>
              Latest crawl jobs submitted to DataForSEO for this website.
            </CardDescription>
          </div>
          <Button
            asChild
            variant="outline"
            className="w-full rounded-lg sm:w-auto"
          >
            <Link href="/dashboard/data-audit-crawler/crawl-jobs">
              View all
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {website.jobs.map((job) => (
              <div
                key={job.id}
                className="flex flex-col gap-2 rounded-lg border border-gray-100 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {job.providerTaskId ?? job.id}
                  </p>
                  <p className="text-xs text-gray-500">
                    {job.provider} · Created {formatDate(job.createdAt)}
                  </p>
                  {job.errorMessage ? (
                    <p className="mt-1 text-xs text-red-600">
                      {job.errorMessage}
                    </p>
                  ) : null}
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "w-fit rounded-lg",
                    getStatusClassName(job.status),
                  )}
                >
                  {statusLabel[job.status]}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export { DataAuditCrawlerDetail };
