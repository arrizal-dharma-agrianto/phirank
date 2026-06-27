"use client";

import { ArrowLeftIcon, LightningIcon } from "@phosphor-icons/react";
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
import { useActiveTenant } from "@/modules/tenant/hooks";

import { getWebAudit } from "../services";
import { AuditResult } from "./audit-result";

type AuditDetailProps = {
  auditId: string;
};

const AuditDetail = ({ auditId }: AuditDetailProps) => {
  const { activeTenantId } = useActiveTenant();
  const {
    data: audit,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["web-audits", activeTenantId, auditId],
    queryFn: () => getWebAudit(auditId),
    enabled: !!activeTenantId,
    refetchInterval: (query) => {
      const audit = query.state.data;

      return audit?.status === "QUEUED" || audit?.status === "RUNNING"
        ? 2000
        : false;
    },
  });
  const isInProgress = audit?.status === "QUEUED" || audit?.status === "RUNNING";

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button
            asChild
            variant="ghost"
            className="mb-3 w-fit rounded-lg px-0 text-gray-500 hover:bg-transparent hover:text-gray-900"
          >
            <Link href="/dashboard/web-audit/history">
              <ArrowLeftIcon aria-hidden="true" className="size-3.5" />
              Back to history
            </Link>
          </Button>

          <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
            Audit Detail
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-gray-950">
            Website audit snapshot
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Review the saved HTTP analyzer result for this website audit.
          </p>
        </div>

        {audit ? (
          <Button
            asChild
            className="w-full rounded-lg bg-gray-900 text-white hover:bg-gray-800 sm:w-auto"
          >
            <Link href={`/dashboard/web-audit/analyze?url=${encodeURIComponent(audit.url)}`}>
              <LightningIcon aria-hidden="true" className="size-3.5" />
              Run again
            </Link>
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          <Card className="rounded-lg border border-gray-100 shadow-sm">
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-full max-w-lg" />
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-24 rounded-lg" />
                ))}
              </div>
            </CardContent>
          </Card>
          <Skeleton className="h-48 rounded-lg" />
        </div>
      ) : error ? (
        <Card className="rounded-lg border border-red-100 bg-red-50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-red-700">
              Audit not available
            </CardTitle>
            <CardDescription className="text-red-600">
              {error instanceof Error
                ? error.message
                : "Failed to load website audit."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : audit && isInProgress ? (
        <Card className="rounded-lg border border-gray-100 shadow-sm">
          <CardHeader className="gap-3 sm:flex sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Audit in progress</CardTitle>
                <Badge
                  variant="outline"
                  className="rounded-lg border-amber-200 bg-amber-50 text-amber-700"
                >
                  {audit.status}
                </Badge>
              </div>
              <CardDescription className="break-all">
                {audit.url}
              </CardDescription>
            </div>
            <p className="text-sm font-medium text-gray-900">
              {audit.progress ?? 0}%
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gray-900 transition-all"
                style={{ width: `${audit.progress ?? 0}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-gray-600">
              {audit.currentStep ?? "Preparing audit"}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              This page refreshes automatically while the analyzer runs in the
              background.
            </p>
          </CardContent>
        </Card>
      ) : audit ? (
        <AuditResult result={audit} />
      ) : null}
    </div>
  );
};

export { AuditDetail };
