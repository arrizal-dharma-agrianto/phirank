"use client";

import {
  ChartLineUpIcon,
  GlobeSimpleIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

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

import type { WebAuditResult } from "../types";
import { useDeleteWebAudit } from "../hooks";
import { getWebAudits } from "../services";

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

const isRunningAudit = (audit: WebAuditResult) => {
  return audit.status === "QUEUED" || audit.status === "RUNNING";
};

const AuditHistory = () => {
  const { activeTenantId } = useActiveTenant();
  const [deletingAudit, setDeletingAudit] = useState<WebAuditResult | null>(
    null,
  );
  const deleteAuditMutation = useDeleteWebAudit();
  const { data: audits, isLoading, error } = useQuery({
    queryKey: ["web-audits", activeTenantId],
    queryFn: getWebAudits,
    enabled: !!activeTenantId,
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.some(isRunningAudit) ? 2000 : false;
    },
  });
  const isDeleting = deleteAuditMutation.isPending;
  const recentAudits =
    audits?.filter((audit) => !isRunningAudit(audit)) ?? [];

  const handleDelete = async () => {
    if (!deletingAudit?.id) return;

    await deleteAuditMutation.mutateAsync(deletingAudit.id);
    setDeletingAudit(null);
  };

  return (
    <>
      <div className="mx-auto grid w-full max-w-6xl gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
          Audit History
        </p>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-gray-950">
            Website audit history
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Review the latest website audits saved for the active workspace.
          </p>
        </div>
      </div>

      <Card className="rounded-lg border border-gray-100 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ChartLineUpIcon aria-hidden="true" className="size-4" />
            Recent audits
          </CardTitle>
          <CardDescription>
            Showing the latest 25 audit snapshots.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
              {error instanceof Error
                ? error.message
                : "Failed to load audit history."}
            </div>
          ) : recentAudits.length ? (
            <div className="grid gap-3">
              {recentAudits.map((audit) => (
                <div
                  key={audit.id ?? `${audit.url}-${audit.createdAt}`}
                  className="flex flex-col gap-3 rounded-lg border border-gray-100 p-4 transition-colors hover:border-gray-200 hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <Link
                    href={`/dashboard/web-audit/history/${audit.id}`}
                    className="min-w-0 flex-1"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <GlobeSimpleIcon
                          aria-hidden="true"
                          className="size-4 shrink-0 text-gray-400"
                        />
                        <p className="truncate font-medium text-gray-900">
                          {audit.url}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {audit.auditedAt}
                      </p>
                    </div>
                  </Link>

                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-lg",
                        getStatusClassName(audit.status),
                      )}
                    >
                      {audit.status ?? "COMPLETED"}
                    </Badge>
                    <div className="text-right">
                      <p
                        className={cn(
                          "text-lg font-semibold",
                          getScoreTone(audit.overallScore),
                        )}
                      >
                        {audit.overallScore}
                      </p>
                      <p className="text-xs text-gray-500">Score</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                      aria-label={`Delete audit for ${audit.url}`}
                      onClick={() => setDeletingAudit(audit)}
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
                <GlobeSimpleIcon
                  aria-hidden="true"
                  className="size-5 text-gray-500"
                />
              </div>
              <h3 className="text-sm font-medium text-gray-900">
                No audits yet
              </h3>
              <p className="mx-auto mt-1 max-w-md text-xs text-gray-500">
                Run your first website audit from the Web Audit page.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      <AlertDialog
        open={!!deletingAudit}
        onOpenChange={(open) => !open && setDeletingAudit(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete audit history?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the saved audit for{" "}
              {deletingAudit?.url}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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

export { AuditHistory };
