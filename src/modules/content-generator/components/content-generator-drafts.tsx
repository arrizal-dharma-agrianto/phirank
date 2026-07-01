"use client";

import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { useActiveTenant } from "@/modules/tenant/hooks";

import {
  deleteContentGeneratorDraft,
  getContentGeneratorDrafts,
} from "../services";
import type {
  ContentGeneratorDraftFilterStatus,
  ContentGeneratorDraftListItem,
  ContentGeneratorDraftSortBy,
  ContentGeneratorDraftSortOrder,
  ContentGeneratorDraftStatus,
} from "../types";

const pageSizeOptions = [10, 25, 50] as const;

const statusLabels: Record<ContentGeneratorDraftStatus, string> = {
  draft: "Draft",
  published: "Published",
  failed_to_publish: "Failed to publish",
};

const statusStyles: Record<ContentGeneratorDraftStatus, string> = {
  draft: "border-gray-200 bg-gray-50 text-gray-600",
  published: "border-emerald-200 bg-emerald-50 text-emerald-700",
  failed_to_publish: "border-red-200 bg-red-50 text-red-700",
};

const statusIcons = {
  draft: ClockIcon,
  published: CheckCircleIcon,
  failed_to_publish: WarningCircleIcon,
} satisfies Record<ContentGeneratorDraftStatus, typeof ClockIcon>;

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const ContentGeneratorDrafts = () => {
  const { activeTenantId } = useActiveTenant();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [status, setStatus] = useState<ContentGeneratorDraftFilterStatus>("all");
  const [sortBy, setSortBy] = useState<ContentGeneratorDraftSortBy>("createdAt");
  const [sortOrder, setSortOrder] =
    useState<ContentGeneratorDraftSortOrder>("desc");
  const [deletingDraft, setDeletingDraft] =
    useState<ContentGeneratorDraftListItem | null>(null);
  const { data: drafts, error, isLoading } = useQuery({
    queryKey: [
      "content-generator-drafts",
      activeTenantId,
      page,
      pageSize,
      search,
      status,
      sortBy,
      sortOrder,
    ],
    queryFn: () =>
      getContentGeneratorDrafts({
        page,
        pageSize,
        search,
        status,
        sortBy,
        sortOrder,
      }),
  });
  const deleteDraftMutation = useMutation({
    mutationFn: deleteContentGeneratorDraft,
    onSuccess: (_data, draftId) => {
      toast.success("Draft deleted");
      queryClient.removeQueries({
        queryKey: ["content-generator-draft", activeTenantId, draftId],
      });
      queryClient.invalidateQueries({
        queryKey: ["content-generator-drafts", activeTenantId],
      });
      if (drafts?.items.length === 1 && page > 1) {
        setPage((current) => Math.max(1, current - 1));
      }
      setDeletingDraft(null);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete generated draft.",
      );
    },
  });
  const isDeleting = deleteDraftMutation.isPending;
  const draftItems = drafts?.items ?? [];
  const pagination = drafts?.pagination;
  const firstPageItem =
    pagination && pagination.total > 0
      ? (pagination.page - 1) * pagination.pageSize + 1
      : 0;
  const lastPageItem = pagination
    ? Math.min(pagination.total, pagination.page * pagination.pageSize)
    : 0;
  const hasActiveFilters = !!search || status !== "all";

  const handleDeleteDraft = () => {
    if (!deletingDraft) return;

    deleteDraftMutation.mutate(deletingDraft.id);
  };

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setPage(1);
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearch(searchDraft.trim());
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatus(value as ContentGeneratorDraftFilterStatus);
    setPage(1);
  };

  const handleSortByChange = (value: string) => {
    setSortBy(value as ContentGeneratorDraftSortBy);
    setPage(1);
  };

  const handleSortOrderChange = (value: string) => {
    setSortOrder(value as ContentGeneratorDraftSortOrder);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearch("");
    setSearchDraft("");
    setStatus("all");
    setPage(1);
  };

  return (
    <>
      <div className="mx-auto grid w-full max-w-6xl gap-5">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
            Content Generator
          </p>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-gray-950">
              Draft
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Semua konten yang pernah digenerate, termasuk status publish
              terakhirnya.
            </p>
          </div>
        </div>

        <Card className="rounded-lg border border-gray-100 shadow-sm">
          <CardHeader className="gap-3">
            <div>
              <CardTitle className="text-base">Generated content</CardTitle>
              <CardDescription>
                Buka detail untuk melihat konten lengkap dan metadata publish.
              </CardDescription>
            </div>

            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <form
                className="flex w-full flex-col gap-2 sm:flex-row xl:max-w-md"
                onSubmit={handleSearch}
              >
                <Input
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  placeholder="Search title, slug, status, or publish error"
                  className="h-9 rounded-lg"
                />
                <Button type="submit" variant="outline" className="rounded-lg">
                  <MagnifyingGlassIcon aria-hidden="true" className="size-3.5" />
                  Search
                </Button>
              </form>

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Select value={status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-full rounded-lg sm:w-44">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="failed_to_publish">
                      Failed to publish
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={handleSortByChange}>
                  <SelectTrigger className="w-full rounded-lg sm:w-40">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">Created</SelectItem>
                    <SelectItem value="updatedAt">Updated</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="publishedAt">Published</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortOrder} onValueChange={handleSortOrderChange}>
                  <SelectTrigger className="w-full rounded-lg sm:w-36">
                    <SelectValue placeholder="Order" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Descending</SelectItem>
                    <SelectItem value="asc">Ascending</SelectItem>
                  </SelectContent>
                </Select>

                {hasActiveFilters ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-lg"
                    onClick={handleClearFilters}
                  >
                    Clear
                  </Button>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-20 rounded-lg" />
                ))}
              </div>
            ) : error ? (
              <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                {error instanceof Error
                  ? error.message
                  : "Failed to load generated drafts."}
              </div>
            ) : draftItems.length ? (
              <div className="grid gap-3">
                {draftItems.map((draft) => {
                  const StatusIcon = statusIcons[draft.status];

                  return (
                    <div
                      key={draft.id}
                      className="grid gap-3 rounded-lg border border-gray-100 p-4 transition hover:border-gray-200 hover:bg-gray-50 sm:grid-cols-[minmax(0,1fr)_auto]"
                    >
                      <div className="min-w-0">
                        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                          <h3 className="truncate text-sm font-medium text-gray-950">
                            {draft.title}
                          </h3>
                          <Badge
                            variant="outline"
                            className={`w-fit rounded-lg ${statusStyles[draft.status]}`}
                          >
                            <StatusIcon
                              aria-hidden="true"
                              className="size-3"
                            />
                            {statusLabels[draft.status]}
                          </Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                          <span>Generated {formatDate(draft.createdAt)}</span>
                          {draft.model ? (
                            <span>Model {draft.model}</span>
                          ) : null}
                          {draft.publishStatusCode ? (
                            <span>HTTP {draft.publishStatusCode}</span>
                          ) : null}
                        </div>
                        {draft.publishError ? (
                          <p className="mt-2 line-clamp-2 text-xs text-red-600">
                            {draft.publishError}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                          aria-label={`Delete ${draft.title} draft`}
                          onClick={() => setDeletingDraft(draft)}
                        >
                          <TrashIcon aria-hidden="true" className="size-4" />
                        </Button>
                        <Button
                          asChild
                          variant="outline"
                          className="rounded-lg"
                        >
                          <Link
                            href={`/dashboard/content-generator/draft/${draft.id}`}
                          >
                            Detail
                            <ArrowRightIcon
                              aria-hidden="true"
                              className="size-3.5"
                            />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center">
                <p className="text-sm font-medium text-gray-900">
                  Belum ada draft
                </p>
                <p className="mx-auto mt-1 max-w-md text-xs text-gray-500">
                  {hasActiveFilters
                    ? `Tidak ada draft yang cocok${search ? ` untuk "${search}"` : ""}.`
                    : "Konten yang digenerate dari halaman Generate akan muncul di sini."}
                </p>
              </div>
            )}

            {pagination && pagination.total > 0 ? (
              <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <p>
                    Showing {firstPageItem}-{lastPageItem} of{" "}
                    {pagination.total} drafts
                    {search ? ` for "${search}"` : ""}
                  </p>
                  <Select
                    value={String(pageSize)}
                    onValueChange={handlePageSizeChange}
                  >
                    <SelectTrigger className="w-fit rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {pageSizeOptions.map((option) => (
                        <SelectItem key={option} value={String(option)}>
                          {option} per page
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-lg"
                    disabled={pagination.page <= 1}
                    onClick={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
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
            ) : null}
          </CardContent>
        </Card>
      </div>

      <AlertDialog
        open={!!deletingDraft}
        onOpenChange={(open) => !open && setDeletingDraft(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete generated draft?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deletingDraft?.title}&quot;
              from the draft list. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDraft}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export { ContentGeneratorDrafts };
