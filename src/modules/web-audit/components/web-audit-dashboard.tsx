"use client";

import {
  ArrowRightIcon,
  ChartLineUpIcon,
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

import { getWebAudits } from "../services";
import type { WebAuditResult } from "../types";
import { WebAuditForm } from "./web-audit-form";

const isRunningAudit = (audit: WebAuditResult) => {
  return audit.status === "QUEUED" || audit.status === "RUNNING";
};

const getScoreTone = (score: number) => {
  if (score >= 85) return "text-emerald-600";
  if (score >= 70) return "text-amber-600";
  return "text-red-600";
};

const getStatusClassName = (status?: string) => {
  if (status === "FAILED") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (status === "QUEUED" || status === "RUNNING") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
};

const AuditRow = ({ audit }: { audit: WebAuditResult }) => (
  <Link
    href={`/dashboard/web-audit/history/${audit.id}`}
    className="flex flex-col gap-3 rounded-lg border border-gray-100 p-3 transition-colors hover:border-gray-200 hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between"
  >
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <GlobeSimpleIcon
          aria-hidden="true"
          className="size-4 shrink-0 text-gray-400"
        />
        <p className="truncate font-medium text-gray-900">{audit.url}</p>
      </div>
      <p className="mt-1 text-xs text-gray-500">{audit.auditedAt}</p>
      {isRunningAudit(audit) ? (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-gray-900"
              style={{ width: `${audit.progress ?? 0}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {audit.currentStep ?? "Preparing audit"}
          </p>
        </div>
      ) : null}
    </div>

    <div className="flex items-center gap-3">
      <Badge
        variant="outline"
        className={cn("rounded-lg", getStatusClassName(audit.status))}
      >
        {audit.status ?? "COMPLETED"}
      </Badge>
      <div className="text-right">
        <p className={cn("text-lg font-semibold", getScoreTone(audit.overallScore))}>
          {audit.overallScore}
        </p>
        <p className="text-xs text-gray-500">Score</p>
      </div>
    </div>
  </Link>
);

const WebAuditDashboard = () => {
  const { activeTenantId } = useActiveTenant();
  const { data: audits, isLoading, error } = useQuery({
    queryKey: ["web-audits", activeTenantId],
    queryFn: getWebAudits,
    enabled: !!activeTenantId,
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.some(isRunningAudit) ? 2000 : false;
    },
  });
  const runningAudits = audits?.filter(isRunningAudit) ?? [];
  const recentAudits =
    audits?.filter((audit) => !isRunningAudit(audit)).slice(0, 3) ?? [];

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5">
      <WebAuditForm />

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Card className="rounded-lg border border-gray-100 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ChartLineUpIcon aria-hidden="true" className="size-4" />
              Running audits
            </CardTitle>
            <CardDescription>
              Audits currently queued or running in the background.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid gap-3">
                <Skeleton className="h-20 rounded-lg" />
                <Skeleton className="h-20 rounded-lg" />
              </div>
            ) : error ? (
              <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                {error instanceof Error
                  ? error.message
                  : "Failed to load running audits."}
              </div>
            ) : runningAudits.length ? (
              <div className="grid gap-3">
                {runningAudits.map((audit) => (
                  <AuditRow key={audit.id} audit={audit} />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center">
                <p className="text-sm font-medium text-gray-900">
                  No running audits
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Submit a URL to queue a new background audit.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-lg border border-gray-100 shadow-sm">
          <CardHeader className="gap-3 sm:flex sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <GlobeSimpleIcon aria-hidden="true" className="size-4" />
                Recent audits
              </CardTitle>
              <CardDescription>Latest 3 audit snapshots.</CardDescription>
            </div>
            <Button
              asChild
              variant="outline"
              className="w-full rounded-lg sm:w-auto"
            >
              <Link href="/dashboard/web-audit/history">
                View history
                <ArrowRightIcon aria-hidden="true" className="size-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid gap-3">
                <Skeleton className="h-16 rounded-lg" />
                <Skeleton className="h-16 rounded-lg" />
                <Skeleton className="h-16 rounded-lg" />
              </div>
            ) : error ? (
              <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                {error instanceof Error
                  ? error.message
                  : "Failed to load recent audits."}
              </div>
            ) : recentAudits.length ? (
              <div className="grid gap-3">
                {recentAudits.map((audit) => (
                  <AuditRow key={audit.id} audit={audit} />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center">
                <p className="text-sm font-medium text-gray-900">
                  No audits yet
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Your latest audit snapshots will appear here.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export { WebAuditDashboard };
