"use client";

import {
  ArrowClockwiseIcon,
  CheckCircleIcon,
  ClipboardTextIcon,
  KeyIcon,
  LightningIcon,
} from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";

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

import {
  getContentGeneratorIndexNow,
  updateContentGeneratorIndexNow,
} from "../services";
import type { ContentGeneratorIndexNow as ContentGeneratorIndexNowSettings } from "../types";

const statusLabels: Record<ContentGeneratorIndexNowSettings["status"], string> = {
  not_enabled: "Not enabled",
  pending_setup: "Pending setup",
  key_verified: "Key verified",
  ready: "Ready",
  submission_failed: "Submission failed",
};

const statusStyles: Record<ContentGeneratorIndexNowSettings["status"], string> = {
  not_enabled: "border-gray-200 bg-gray-50 text-gray-600",
  pending_setup: "border-amber-200 bg-amber-50 text-amber-700",
  key_verified: "border-emerald-200 bg-emerald-50 text-emerald-700",
  ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
  submission_failed: "border-red-200 bg-red-50 text-red-700",
};

const setupSteps = [
  "Click Enable IndexNow to generate a unique key for this workspace.",
  "Create a text file in the root of the configured website using the generated file name.",
  "Put only the generated key inside the file. No JSON, HTML, or extra text.",
  "Publish the file so it can be opened publicly from the shown key location.",
  "Click Verify Key. When the file content matches, the status becomes Ready.",
];

type CopyTarget = "fileName" | "fileContent" | "keyLocation";

const ContentGeneratorIndexNow = () => {
  const { activeTenantId } = useActiveTenant();
  const queryClient = useQueryClient();
  const [copiedTarget, setCopiedTarget] = useState<CopyTarget | null>(null);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const query = useQuery({
    queryKey: ["content-generator-indexnow", activeTenantId],
    queryFn: getContentGeneratorIndexNow,
  });

  const mutation = useMutation({
    mutationFn: updateContentGeneratorIndexNow,
    onSuccess: (data, action) => {
      queryClient.setQueryData(
        ["content-generator-indexnow", activeTenantId],
        data,
      );

      if (action === "enable") {
        toast.success("IndexNow key generated", {
          description: "Install the key file to continue.",
        });
        return;
      }

      if (data.indexNow.status === "ready") {
        toast.success("IndexNow key file verified", {
          description: "The workspace is ready.",
        });
        return;
      }

      toast.error("IndexNow key is not verified yet", {
        description:
          data.indexNow.lastError ??
          "Check the setup instructions and try again.",
      });
    },
    onError: (error) => {
      toast.error("Failed to update IndexNow settings", {
        description:
          error instanceof Error
            ? error.message
            : "Please check the setup and try again.",
      });
    },
  });

  const indexNow = query.data?.indexNow;
  const website = query.data?.website;
  const isEnabled = !!indexNow && indexNow.status !== "not_enabled";
  const fileName = indexNow?.key ? `${indexNow.key}.txt` : null;

  const handleCopy = async (
    value: string | null | undefined,
    target: CopyTarget,
  ) => {
    if (!value) return;

    await navigator.clipboard.writeText(value);
    toast.success("Copied to clipboard");
    setCopiedTarget(target);

    if (copiedTimeoutRef.current) {
      clearTimeout(copiedTimeoutRef.current);
    }

    copiedTimeoutRef.current = setTimeout(() => {
      setCopiedTarget(null);
      copiedTimeoutRef.current = null;
    }, 3000);
  };

  if (query.isLoading) {
    return (
      <div className="mx-auto grid w-full max-w-6xl gap-5">
        <Skeleton className="h-24 w-full rounded-lg" />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Skeleton className="h-96 w-full rounded-lg" />
          <Skeleton className="h-96 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
          Content Generator
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-gray-950">
              IndexNow
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-gray-500">
              Verify ownership of the configured website before phirank can
              submit published URLs to IndexNow.
            </p>
          </div>
          <Badge
            variant="outline"
            className={`h-7 rounded-lg px-3 ${statusStyles[indexNow?.status ?? "not_enabled"]}`}
          >
            {statusLabels[indexNow?.status ?? "not_enabled"]}
          </Badge>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card className="rounded-lg border border-gray-100 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LightningIcon aria-hidden="true" className="size-4" />
              IndexNow status
            </CardTitle>
            <CardDescription>
              Generate and verify the key file for the active workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {!website ? (
              <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
                Configure a website before enabling IndexNow.{" "}
                <Link className="font-medium underline" href="/settings/website">
                  Open website settings
                </Link>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
                  Website
                </p>
                <p className="mt-1 text-sm font-medium text-gray-900">
                  {website.name}
                </p>
                <p className="mt-1 break-all text-xs text-gray-500">
                  {website.startUrl}
                </p>
              </div>
            )}

            {isEnabled ? (
              <div className="grid gap-3">
                <div className="rounded-lg border border-gray-100 p-3">
                  <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
                    Key file name
                  </p>
                  <div className="mt-2 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start">
                    <code className="min-w-0 flex-1 whitespace-pre-wrap break-all rounded bg-gray-50 px-2 py-2 text-xs leading-5 text-gray-800">
                      {fileName}
                    </code>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0 rounded-lg"
                      aria-label="Copy key file name"
                      onClick={() => handleCopy(fileName, "fileName")}
                    >
                      {copiedTarget === "fileName" ? (
                        <CheckCircleIcon
                          aria-hidden="true"
                          className="size-3.5 text-emerald-600"
                        />
                      ) : (
                        <ClipboardTextIcon
                          aria-hidden="true"
                          className="size-3.5"
                        />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-100 p-3">
                  <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
                    File content
                  </p>
                  <div className="mt-2 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start">
                    <code className="min-w-0 flex-1 whitespace-pre-wrap break-all rounded bg-gray-50 px-2 py-2 text-xs leading-5 text-gray-800">
                      {indexNow?.key}
                    </code>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0 rounded-lg"
                      aria-label="Copy key file content"
                      onClick={() => handleCopy(indexNow?.key, "fileContent")}
                    >
                      {copiedTarget === "fileContent" ? (
                        <CheckCircleIcon
                          aria-hidden="true"
                          className="size-3.5 text-emerald-600"
                        />
                      ) : (
                        <ClipboardTextIcon
                          aria-hidden="true"
                          className="size-3.5"
                        />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-100 p-3">
                  <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
                    Key location
                  </p>
                  <div className="mt-2 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start">
                    <code className="min-w-0 flex-1 whitespace-pre-wrap break-all rounded bg-gray-50 px-2 py-2 text-xs leading-5 text-gray-800">
                      {indexNow?.keyLocation}
                    </code>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0 rounded-lg"
                      aria-label="Copy key location"
                      onClick={() =>
                        handleCopy(indexNow?.keyLocation, "keyLocation")
                      }
                    >
                      {copiedTarget === "keyLocation" ? (
                        <CheckCircleIcon
                          aria-hidden="true"
                          className="size-3.5 text-emerald-600"
                        />
                      ) : (
                        <ClipboardTextIcon
                          aria-hidden="true"
                          className="size-3.5"
                        />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row">
              {!isEnabled ? (
                <Button
                  type="button"
                  className="rounded-lg bg-gray-900 text-white hover:bg-gray-800"
                  disabled={!website || mutation.isPending}
                  onClick={() => mutation.mutate("enable")}
                >
                  <KeyIcon aria-hidden="true" className="size-3.5" />
                  {mutation.isPending ? "Enabling..." : "Enable IndexNow"}
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    className="rounded-lg bg-gray-900 text-white hover:bg-gray-800"
                    disabled={mutation.isPending}
                    onClick={() => mutation.mutate("verify")}
                  >
                    <CheckCircleIcon aria-hidden="true" className="size-3.5" />
                    {mutation.isPending ? "Verifying..." : "Verify Key"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-lg"
                    disabled={mutation.isPending}
                    onClick={() => mutation.mutate("refresh")}
                  >
                    <ArrowClockwiseIcon
                      aria-hidden="true"
                      className="size-3.5"
                    />
                    Refresh status
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg border border-gray-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Setup documentation</CardTitle>
            <CardDescription>
              Install the key file on the configured website root.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-3">
              {setupSteps.map((step, index) => (
                <div
                  key={step}
                  className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3"
                >
                  <span className="flex size-8 items-center justify-center rounded-lg border border-gray-200 text-sm font-medium text-gray-600">
                    {index + 1}
                  </span>
                  <p className="min-w-0 break-words pt-1.5 text-sm leading-6 text-gray-600">
                    {step}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-gray-100 p-3">
              <p className="text-sm font-medium text-gray-900">
                Example for a Next.js website
              </p>
              <pre className="mt-2 whitespace-pre-wrap break-all rounded bg-gray-950 p-3 text-xs leading-5 text-gray-100">
                <code>{`// public/${fileName ?? "<indexnow-key>.txt"}
${indexNow?.key ?? "<paste-generated-key-here>"}`}</code>
              </pre>
              <p className="mt-2 break-words text-xs leading-5 text-gray-500">
                Files inside the public directory are served from the website
                root, so the verification URL becomes the key location shown on
                this page.
              </p>
            </div>

            <div className="rounded-lg border border-gray-100 p-3">
              <p className="text-sm font-medium text-gray-900">
                Status reference
              </p>
              <div className="mt-3 grid gap-2 break-words text-xs text-gray-600">
                <p>
                  <span className="font-medium text-gray-900">Not enabled:</span>{" "}
                  no IndexNow key has been generated.
                </p>
                <p>
                  <span className="font-medium text-gray-900">
                    Pending setup:
                  </span>{" "}
                  key exists, but the public key file is not verified yet.
                </p>
                <p>
                  <span className="font-medium text-gray-900">
                    Key verified:
                  </span>{" "}
                  the key file content matched during verification.
                </p>
                <p>
                  <span className="font-medium text-gray-900">Ready:</span>{" "}
                  IndexNow is ready for URL submission after publishing.
                </p>
                <p>
                  <span className="font-medium text-gray-900">
                    Submission failed:
                  </span>{" "}
                  a future publish submission failed and needs attention.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export { ContentGeneratorIndexNow };
