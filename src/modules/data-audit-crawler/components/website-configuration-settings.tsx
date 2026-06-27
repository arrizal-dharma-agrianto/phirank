"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { GlobeSimpleIcon } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveTenant } from "@/modules/tenant/hooks";

import {
  websiteCrawlerSchema,
  type WebsiteCrawlerFormInput,
  type WebsiteCrawlerInput,
} from "../schemas";
import { createCrawlerWebsite, getCrawlerWebsites } from "../services";
import type { WebsiteCrawlerListItem } from "../types";
import { toast } from "sonner";

const WebsiteConfigurationForm = ({
  website,
  activeTenantId,
}: {
  website: WebsiteCrawlerListItem | null;
  activeTenantId: string | null;
}) => {
  const queryClient = useQueryClient();
  const form = useForm<WebsiteCrawlerFormInput, unknown, WebsiteCrawlerInput>({
    mode: "onChange",
    resolver: zodResolver(websiteCrawlerSchema),
    defaultValues: {
      name: website?.name ?? "",
      websiteUrl: website?.startUrl ?? "",
      industry: website?.industry ?? "",
      targetCountry: website?.targetCountry ?? "Indonesia",
      targetLanguage: website?.targetLanguage ?? "id",
      maxCrawlPages: website?.maxCrawlPages ?? 100,
    },
  });
  const mutation = useMutation({
    mutationFn: createCrawlerWebsite,
    onSuccess: () => {
      toast.success("Website configured successfully");
      queryClient.invalidateQueries({
        queryKey: ["data-audit-crawler-websites", activeTenantId],
      });
      queryClient.invalidateQueries({
        queryKey: ["content-generator-indexnow", activeTenantId],
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create website",
      )
    }
  });

  return (
    <form
      className="grid gap-4"
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
    >
      <div className="grid gap-2">
        <Label htmlFor="workspace-website-name">Website name</Label>
        <Input
          id="workspace-website-name"
          placeholder="Example: Client marketing site"
          aria-invalid={!!form.formState.errors.name}
          {...form.register("name")}
        />
        {form.formState.errors.name ? (
          <p className="text-xs text-red-500">
            {form.formState.errors.name.message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="workspace-website-url">Website URL</Label>
        <Input
          id="workspace-website-url"
          type="url"
          placeholder="https://example.com"
          aria-invalid={!!form.formState.errors.websiteUrl}
          {...form.register("websiteUrl")}
        />
        {form.formState.errors.websiteUrl ? (
          <p className="text-xs text-red-500">
            {form.formState.errors.websiteUrl.message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="workspace-website-industry">Industry</Label>
        <Input
          id="workspace-website-industry"
          placeholder="Example: Healthcare, education, SaaS"
          {...form.register("industry")}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="workspace-website-country">Country</Label>
          <Input
            id="workspace-website-country"
            {...form.register("targetCountry")}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="workspace-website-language">Language</Label>
          <Input
            id="workspace-website-language"
            {...form.register("targetLanguage")}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="workspace-website-limit">Max pages</Label>
          <Input
            id="workspace-website-limit"
            type="number"
            min={1}
            max={1000}
            {...form.register("maxCrawlPages")}
          />
        </div>
      </div>

      <Button
        type="submit"
        className="w-full rounded-lg bg-gray-900 text-white hover:bg-gray-800 sm:w-fit"
        disabled={mutation.isPending || !form.formState.isValid}
      >
        <GlobeSimpleIcon aria-hidden="true" className="size-3.5" />
        {mutation.isPending
          ? "Saving..."
          : "Save"}
      </Button>
    </form>
  );
};

const WebsiteConfigurationSettings = () => {
  const { activeTenantId } = useActiveTenant();
  const { data: websites, isLoading, error } = useQuery({
    queryKey: ["data-audit-crawler-websites", activeTenantId],
    queryFn: getCrawlerWebsites,
    enabled: !!activeTenantId,
  });
  const website = websites?.[0] ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Website Configuration</CardTitle>
        <CardDescription>
          One workspace uses one website for crawler data, web audits, and
          content generation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid gap-3">
            <Skeleton className="h-10 rounded-md" />
            <Skeleton className="h-10 rounded-md" />
            <Skeleton className="h-10 rounded-md" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
            {error instanceof Error
              ? error.message
              : "Failed to load website configuration."}
          </div>
        ) : (
          <WebsiteConfigurationForm
            key={website?.id ?? "new"}
            website={website}
            activeTenantId={activeTenantId}
          />
        )}
      </CardContent>
    </Card>
  );
};

export { WebsiteConfigurationSettings };
