"use client";

import {
  CaretDownIcon,
  CheckCircleIcon,
  GearSixIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  getContentGeneratorIndexNow,
  getContentGeneratorIntegrations,
} from "@/modules/content-generator";
import { getCrawlerWebsites } from "@/modules/data-audit-crawler";
import {
  useActiveTenant,
  useTenantSettings,
  useUpdateTenantSettings,
} from "@/modules/tenant/hooks";

const SetupProgressCard = () => {
  const [isMinimized, setIsMinimized] = useState(false);
  const { activeTenantId } = useActiveTenant();
  const { data: settings, isLoading: isLoadingSettings } =
    useTenantSettings();
  const updateSettings = useUpdateTenantSettings();
  const { data: websites } = useQuery({
    queryKey: ["data-audit-crawler-websites", activeTenantId],
    queryFn: getCrawlerWebsites,
    enabled: !!activeTenantId,
  });
  const { data: integrations } = useQuery({
    queryKey: ["content-generator-integrations", activeTenantId],
    queryFn: getContentGeneratorIntegrations,
    enabled: !!activeTenantId,
  });
  const { data: indexNow } = useQuery({
    queryKey: ["content-generator-indexnow", activeTenantId],
    queryFn: getContentGeneratorIndexNow,
    enabled: !!activeTenantId,
  });
  const website = websites?.[0] ?? null;
  const hasCompletedCrawl = Boolean(
    website?.lastCrawledAt || website?.currentCrawlJobId,
  );
  const steps = [
    {
      label: "Website configured",
      done: Boolean(website),
      href: "/settings/website",
    },
    {
      label: "First crawl completed",
      done: hasCompletedCrawl,
      href: "/dashboard/data-audit-crawler",
    },
    {
      label: "Publish webhook configured",
      done: Boolean(integrations?.length),
      href: "/dashboard/content-generator/integration",
    },
    {
      label: "IndexNow ready",
      done:
        indexNow?.indexNow.status === "ready" ||
        indexNow?.indexNow.status === "key_verified",
      href: "/dashboard/content-generator/indexnow",
    },
  ];
  const completedSteps = steps.filter((step) => step.done).length;
  const progress = Math.round((completedSteps / steps.length) * 100);
  const isComplete = progress === 100;
  const shouldShow = settings?.showSetupProgress ?? true;

  if (!shouldShow && !isLoadingSettings) return null;

  if (isMinimized) {
    return (
      <Button
        type="button"
        className="fixed bottom-5 right-5 z-40 rounded-lg bg-gray-900 px-3 text-white shadow-lg hover:bg-gray-800"
        onClick={() => setIsMinimized(false)}
      >
        <GearSixIcon aria-hidden="true" className="size-3.5" />
        Setup {progress}%
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-5 right-5 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-gray-100 bg-white shadow-lg">
      <CardHeader className="gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <GearSixIcon aria-hidden="true" className="size-4 shrink-0" />
              <span>Setup progress</span>
            </CardTitle>
            <p className="mt-1 text-xs text-gray-500">
              {isComplete
                ? "Workspace setup is complete."
                : "Complete setup before production workflows."}
            </p>
            <div className="mt-3 flex w-fit items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-2 py-1.5">
              <button
                type="button"
                role="switch"
                aria-checked={shouldShow}
                aria-label="Show setup progress"
                className="relative h-4 w-7 rounded-full bg-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={updateSettings.isPending || isLoadingSettings}
                onClick={() =>
                  updateSettings.mutate({ showSetupProgress: false })
                }
              >
                <span className="absolute left-3.5 top-0.5 size-3 rounded-full bg-white" />
              </button>
              <span className="text-xs text-gray-600">Show</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold text-gray-950">{progress}%</p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Minimize setup progress"
              onClick={() => setIsMinimized(true)}
            >
              <CaretDownIcon aria-hidden="true" className="size-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-gray-900"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-3 grid gap-2">
          {steps.map((step) => (
            <Link
              key={step.label}
              href={step.href}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition hover:border-gray-200 hover:bg-gray-50",
                step.done
                  ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                  : "border-gray-100 bg-white text-gray-500",
              )}
            >
              <CheckCircleIcon
                aria-hidden="true"
                className={cn(
                  "size-4 shrink-0",
                  step.done ? "text-emerald-600" : "text-gray-300",
                )}
              />
              {step.label}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export { SetupProgressCard };
