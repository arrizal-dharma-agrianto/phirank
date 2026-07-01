"use client";

import {
  ArrowLeftIcon,
  ClockCounterClockwiseIcon,
  GlobeSimpleIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";

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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useActiveTenant } from "@/modules/tenant/hooks";

import { deleteCrawlerJob, getCrawlerJobs } from "../services";
import type { CrawlJob, CrawlStatus } from "../types";

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

const isActiveCrawl = (job: CrawlJob) =>
  job.status === "pending" || job.status === "running";

const formatDate = (value: string | null) => {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const getElapsedTime = (job: CrawlJob, now: number) => {
  if (typeof job.elapsedTimeMs === "number") return job.elapsedTimeMs;
  if (!job.startedAt || !isActiveCrawl(job)) return null;

  return Math.max(0, now - new Date(job.startedAt).getTime());
};

const formatDuration = (milliseconds: number | null) => {
  if (milliseconds === null) return "-";

  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}j ${minutes}m ${seconds}d`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}d`;
  }

  return `${seconds}d`;
};

const formatElapsedTime = (job: CrawlJob, now: number) => {
  const duration = formatDuration(getElapsedTime(job, now));

  if (isActiveCrawl(job)) {
    return `Sedang berjalan ${duration}`;
  }

  if (job.status === "completed") {
    return `Selesai dalam ${duration}`;
  }

  return `Gagal setelah ${duration}`;
};

const CrawlJobHistory = () => {
  const { activeTenantId } = useActiveTenant();
  const queryClient = useQueryClient();
  const [deletingJob, setDeletingJob] = useState<CrawlJob | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const { data: jobs, isLoading, error } = useQuery({
    queryKey: ["data-audit-crawler-crawl-jobs", activeTenantId],
    queryFn: getCrawlerJobs,
    enabled: !!activeTenantId,
    refetchInterval: (query) =>
      query.state.data?.some(isActiveCrawl) ? 5000 : false,
  });
  const deleteMutation = useMutation({
    mutationFn: deleteCrawlerJob,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["data-audit-crawler-crawl-jobs", activeTenantId],
      });
      queryClient.invalidateQueries({
        queryKey: ["data-audit-crawler-websites", activeTenantId],
      });
      queryClient.invalidateQueries({
        queryKey: ["data-audit-crawler-website"],
      });
      setDeletingJob(null);
    },
  });

  useEffect(() => {
    if (!jobs?.some(isActiveCrawl)) return;

    const interval = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(interval);
  }, [jobs]);

  const handleDelete = async () => {
    if (!deletingJob) return;

    await deleteMutation.mutateAsync(deletingJob.id);
  };

  return (
    <>
      <div className="mx-auto grid w-full max-w-6xl gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Button
              asChild
              variant="ghost"
              className="mb-3 w-fit rounded-lg px-0 text-gray-500 hover:bg-transparent hover:text-gray-900"
            >
              <Link href="/dashboard/data-audit-crawler">
                <ArrowLeftIcon aria-hidden="true" className="size-3.5" />
                Back to dashboard
              </Link>
            </Button>

            <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
              Dashboard
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-gray-950">
              Crawl job history
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Review every crawler task submitted for the active workspace.
            </p>
          </div>
        </div>

        <Card className="rounded-lg border border-gray-100 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClockCounterClockwiseIcon
                aria-hidden="true"
                className="size-4"
              />
              Crawl jobs
            </CardTitle>
            <CardDescription>
              Deleting a job also removes its saved pages, links, and summary.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid gap-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-20 rounded-lg" />
                ))}
              </div>
            ) : error ? (
              <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                {error instanceof Error
                  ? error.message
                  : "Failed to load crawl jobs."}
              </div>
            ) : jobs?.length ? (
              <div className="grid gap-3">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex flex-col gap-3 rounded-lg border border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <GlobeSimpleIcon
                          aria-hidden="true"
                          className="size-4 shrink-0 text-gray-400"
                        />
                        <p className="truncate text-sm font-medium text-gray-900">
                          {job.providerTaskId ?? job.id}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {job.websiteName ?? "Workspace website"} ·{" "}
                        {job.provider} · Created {formatDate(job.createdAt)}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Started {formatDate(job.startedAt)} · Finished{" "}
                        {formatDate(job.finishedAt)} · Max pages{" "}
                        {job.maxCrawlPages}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {formatElapsedTime(job, now)}
                      </p>
                      {job.errorMessage ? (
                        <p className="mt-1 text-xs text-red-600">
                          {job.errorMessage}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "w-fit rounded-lg",
                          getStatusClassName(job.status),
                        )}
                      >
                        {statusLabel[job.status]}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                        aria-label={`Delete crawl job ${job.providerTaskId ?? job.id}`}
                        disabled={isActiveCrawl(job)}
                        onClick={() => setDeletingJob(job)}
                      >
                        <TrashIcon aria-hidden="true" className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center">
                <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-lg bg-gray-100">
                  <ClockCounterClockwiseIcon
                    aria-hidden="true"
                    className="size-5 text-gray-500"
                  />
                </div>
                <h3 className="text-sm font-medium text-gray-900">
                  No crawl jobs yet
                </h3>
                <p className="mx-auto mt-1 max-w-md text-xs text-gray-500">
                  Crawl jobs will appear after configuring or updating the
                  workspace website.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog
        open={!!deletingJob}
        onOpenChange={(open) => !open && setDeletingJob(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete crawl job?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the selected crawl job and its saved crawl data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteMutation.error ? (
            <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-700">
              {deleteMutation.error.message}
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                handleDelete();
              }}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete job"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export { CrawlJobHistory };
