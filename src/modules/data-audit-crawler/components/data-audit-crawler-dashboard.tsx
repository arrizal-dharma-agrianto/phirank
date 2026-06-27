"use client";

import { GearSixIcon, GlobeSimpleIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { getCrawlerWebsites } from "../services";
import { useActiveTenant } from "@/modules/tenant/hooks";
import type { WebsiteCrawlerListItem } from "../types";
import { DataAuditCrawlerDetail } from "./data-audit-crawler-detail";

const isActiveCrawl = (website: WebsiteCrawlerListItem) =>
  website.crawlStatus === "pending" || website.crawlStatus === "running";

const DataAuditCrawlerDashboard = () => {
  const { activeTenantId } = useActiveTenant();
  const { data: websites, isLoading, error } = useQuery({
    queryKey: ["data-audit-crawler-websites", activeTenantId],
    queryFn: getCrawlerWebsites,
    enabled: !!activeTenantId,
    refetchInterval: (query) =>
      query.state.data?.some(isActiveCrawl) ? 5000 : false,
  });
  const configuredWebsite = websites?.[0] ?? null;

  if (isLoading) {
    return (
      <div className="mx-auto grid w-full max-w-6xl gap-5">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-72 rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto grid w-full max-w-6xl gap-5">
        <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {error instanceof Error
            ? error.message
            : "Failed to load website dashboard."}
        </div>
      </div>
    );
  }

  if (!configuredWebsite) {
    return (
      <div className="mx-auto grid w-full max-w-6xl gap-5">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
            Dashboard
          </p>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-gray-950">
              Website dashboard
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-gray-500">
              Set up one workspace website to start crawling, auditing, and
              generating content from the same source.
            </p>
          </div>
        </div>

        <Card className="rounded-lg border border-gray-100 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <GlobeSimpleIcon aria-hidden="true" className="size-4" />
              Website is not configured
            </CardTitle>
            <CardDescription>
              Each workspace uses one website as the source for crawler data,
              web audit, and content generation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              asChild
              className="w-full rounded-lg bg-gray-900 text-white hover:bg-gray-800 sm:w-fit"
            >
              <Link href="/settings/website">
                <GearSixIcon aria-hidden="true" className="size-3.5" />
                Configure website
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <DataAuditCrawlerDetail
      websiteId={configuredWebsite.id}
      showBackLink={false}
    />
  );
};

export { DataAuditCrawlerDashboard };
