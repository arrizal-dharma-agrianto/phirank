"use client";

import { GlobeSimpleIcon, LightningIcon } from "@phosphor-icons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import {
  getCrawlerWebsite,
  getCrawlerWebsites,
} from "@/modules/data-audit-crawler/services";
import { useActiveTenant } from "@/modules/tenant/hooks";

import { createWebAudit } from "../services";

const WebAuditForm = () => {
  const queryClient = useQueryClient();
  const { activeTenantId } = useActiveTenant();
  const [isAuditing, setIsAuditing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedPageUrl, setSelectedPageUrl] = useState("");
  const { data: websites, isLoading: isLoadingWebsite } = useQuery({
    queryKey: ["data-audit-crawler-websites", activeTenantId],
    queryFn: getCrawlerWebsites,
    enabled: !!activeTenantId,
  });
  const configuredWebsite = websites?.[0] ?? null;
  const { data: websiteDetail, isLoading: isLoadingPages } = useQuery({
    queryKey: [
      "data-audit-crawler-website",
      configuredWebsite?.id,
      "web-audit-pages",
    ],
    queryFn: () =>
      getCrawlerWebsite(configuredWebsite!.id, {
        page: 1,
        pageSize: 100,
        status: "success",
        sortBy: "createdAt",
        sortOrder: "desc",
      }),
    enabled: !!configuredWebsite?.id,
  });
  const crawledPages = websiteDetail?.pages ?? [];
  const effectivePageUrl = selectedPageUrl || crawledPages[0]?.url || "";
  const selectedPage =
    crawledPages.find((page) => page.url === effectivePageUrl) ??
    crawledPages[0] ??
    null;

  const handleRunAudit = async () => {
    if (!effectivePageUrl) {
      setErrorMessage("Select a crawled page before running an audit.");
      return;
    }

    setIsAuditing(true);
    setErrorMessage(null);

    try {
      await createWebAudit({ url: effectivePageUrl });
      queryClient.invalidateQueries({ queryKey: ["web-audits", activeTenantId] });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to run website audit.",
      );
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
          Web Audit
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-gray-950">
              Analyze configured website
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Run audits against the website configured in workspace settings,
              then track the background progress in history.
            </p>
          </div>
        </div>
      </div>

      <Card className="rounded-lg border border-gray-100 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GlobeSimpleIcon aria-hidden="true" className="size-4" />
            New website audit
          </CardTitle>
          <CardDescription>
            Choose a crawled page from the configured website.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              {isLoadingWebsite || isLoadingPages ? (
                <div className="grid gap-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-72" />
                </div>
              ) : crawledPages.length ? (
                <div className="grid gap-2">
                  <Select
                    value={effectivePageUrl}
                    onValueChange={setSelectedPageUrl}
                  >
                    <SelectTrigger className="w-full rounded-lg lg:max-w-xl">
                      <SelectValue placeholder="Select crawled page" />
                    </SelectTrigger>
                    <SelectContent>
                      {crawledPages.map((page, index) => (
                        <SelectItem key={page.id} value={page.url}>
                          {page.title ?? page.url}
                          {index === 0 ? " (terbaru)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="truncate text-xs text-gray-500">
                    {selectedPage?.url}
                  </p>
                </div>
              ) : configuredWebsite ? (
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    No crawled pages available
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Run a crawl for {configuredWebsite.name} before starting a
                    web audit.
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Website is not configured
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Add your workspace website before running an audit.
                  </p>
                </div>
              )}
              {errorMessage ? (
                <p className="mt-2 text-xs text-red-500">{errorMessage}</p>
              ) : null}
            </div>

            {configuredWebsite ? (
              <Button
                type="button"
                className="w-full rounded-lg bg-gray-900 text-white hover:bg-gray-800 lg:w-auto"
                disabled={
                  isAuditing ||
                  isLoadingWebsite ||
                  isLoadingPages ||
                  !effectivePageUrl
                }
                onClick={handleRunAudit}
              >
                <LightningIcon aria-hidden="true" className="size-3.5" />
                {isAuditing ? "Auditing..." : "Run Audit"}
              </Button>
            ) : (
              <Button
                asChild
                variant="outline"
                className="w-full rounded-lg lg:w-auto"
              >
                <Link href="/settings/website">Open settings</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export { WebAuditForm };
