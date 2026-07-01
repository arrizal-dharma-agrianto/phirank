"use client";

import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  SparkleIcon,
  TrashIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import {
  deleteContentGeneratorDraft,
  getContentGeneratorDraft,
  getContentGeneratorIntegrations,
  publishGeneratedContent,
} from "../services";
import type { ContentGeneratorDraftStatus } from "../types";
import type { ContentGeneratorInput } from "../schemas";
import { ContentGeneratorStructuredContent } from "./content-generator-structured-content";

type PublishDelivery = Awaited<ReturnType<typeof publishGeneratedContent>>;

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

const getPublishSuccessMessage = (delivery: PublishDelivery) =>
  [
    `Published to webhook. Delivery ${delivery.deliveryId} returned HTTP ${delivery.status}.`,
    delivery.indexNow
      ? delivery.indexNow.status === "submitted"
        ? `IndexNow submitted ${delivery.indexNow.submittedUrl}.`
        : `IndexNow ${delivery.indexNow.status}: ${delivery.indexNow.message}`
      : null,
  ]
    .filter(Boolean)
    .join(" ");

const formatDate = (value: string | null) => {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const ContentGeneratorDraftDetail = ({ draftId }: { draftId: string }) => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [selectedIntegrationId, setSelectedIntegrationId] = useState("");
  const [submitToIndexNow, setSubmitToIndexNow] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { data: draft, error, isLoading } = useQuery({
    queryKey: ["content-generator-draft", draftId],
    queryFn: () => getContentGeneratorDraft(draftId),
  });
  const { data: integrations, isLoading: isLoadingIntegrations } = useQuery({
    queryKey: ["content-generator-integrations"],
    queryFn: getContentGeneratorIntegrations,
  });
  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!draft) throw new Error("Generated content draft not found.");

      const integrationId = selectedIntegrationId || integrations?.[0]?.id;

      if (!integrationId) {
        throw new Error("Configure a webhook integration before publishing.");
      }

      return publishGeneratedContent({
        integrationId,
        contentId: draft.id,
        content: draft.content,
        model: draft.model ?? undefined,
        source: draft.source as ContentGeneratorInput,
        submitToIndexNow,
      });
    },
    onSuccess: (delivery) => {
      queryClient.invalidateQueries({
        queryKey: ["content-generator-draft", draftId],
      });
      queryClient.invalidateQueries({
        queryKey: ["content-generator-drafts"],
      });
      const successMessage = getPublishSuccessMessage(delivery);

      toast.success("Published to webhook", {
        description: successMessage,
      });
    },
    onError: (error) => {
      queryClient.invalidateQueries({
        queryKey: ["content-generator-draft", draftId],
      });
      queryClient.invalidateQueries({
        queryKey: ["content-generator-drafts"],
      });
      toast.error("Failed to publish content", {
        description:
          error instanceof Error
            ? error.message
            : "Please check the webhook and try again.",
      });
    },
  });
  const deleteDraftMutation = useMutation({
    mutationFn: deleteContentGeneratorDraft,
    onSuccess: () => {
      toast.success("Draft deleted");
      queryClient.removeQueries({
        queryKey: ["content-generator-draft", draftId],
      });
      queryClient.invalidateQueries({
        queryKey: ["content-generator-drafts"],
      });
      router.push("/dashboard/content-generator/draft");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete generated draft.",
      );
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto grid w-full max-w-6xl gap-5">
        <Skeleton className="h-24 rounded-lg" />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <Skeleton className="h-[560px] rounded-lg" />
          <Skeleton className="h-80 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !draft) {
    return (
      <div className="mx-auto grid w-full max-w-6xl gap-5">
        <Button asChild variant="outline" className="w-fit rounded-lg">
          <Link href="/dashboard/content-generator/draft">
            <ArrowLeftIcon aria-hidden="true" className="size-3.5" />
            Back to drafts
          </Link>
        </Button>
        <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {error instanceof Error
            ? error.message
            : "Generated content draft not found."}
        </div>
      </div>
    );
  }

  const StatusIcon = statusIcons[draft.status];
  const canPublish =
    draft.status === "draft" || draft.status === "failed_to_publish";
  const hasIntegration = !!integrations?.length;
  const publishIntegrationId = selectedIntegrationId || integrations?.[0]?.id || "";

  return (
    <>
      <div className="mx-auto grid w-full max-w-6xl gap-5">
        <div className="flex flex-col gap-3">
          <Button asChild variant="outline" className="w-fit rounded-lg">
            <Link href="/dashboard/content-generator/draft">
              <ArrowLeftIcon aria-hidden="true" className="size-3.5" />
              Back to drafts
            </Link>
          </Button>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
                Generated content
              </p>
              <h2 className="mt-1 break-words text-2xl font-semibold tracking-tight text-gray-950">
                {draft.title}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Generated {formatDate(draft.createdAt)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={`h-7 w-fit rounded-lg px-3 ${statusStyles[draft.status]}`}
              >
                <StatusIcon aria-hidden="true" className="size-3" />
                {statusLabels[draft.status]}
              </Badge>
              <Button
                type="button"
                variant="outline"
                className="rounded-lg border-red-100 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <TrashIcon aria-hidden="true" className="size-3.5" />
                Delete
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <Card className="rounded-lg border border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Content</CardTitle>
              <CardDescription>Full generated draft output.</CardDescription>
            </CardHeader>
            <CardContent>
              <ContentGeneratorStructuredContent content={draft.structuredContent} />
            </CardContent>
          </Card>

          <div className="grid gap-5 content-start">
            <Card className="rounded-lg border border-gray-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Publish status</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
                    Status
                  </p>
                  <p className="mt-1 text-gray-900">
                    {statusLabels[draft.status]}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
                    Published at
                  </p>
                  <p className="mt-1 text-gray-900">
                    {formatDate(draft.publishedAt)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
                    Delivery ID
                  </p>
                  <p className="mt-1 break-all text-gray-900">
                    {draft.publishDeliveryId ?? "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
                    HTTP status
                  </p>
                  <p className="mt-1 text-gray-900">
                    {draft.publishStatusCode ?? "-"}
                  </p>
                </div>
                {draft.publishError ? (
                  <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-xs leading-5 text-red-700">
                    {draft.publishError}
                  </div>
                ) : null}
                {canPublish ? (
                  <div className="grid gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="detail-publish-webhook">
                        Publish webhook
                      </Label>
                      <Select
                        value={publishIntegrationId}
                        onValueChange={setSelectedIntegrationId}
                        disabled={isLoadingIntegrations || !hasIntegration}
                      >
                        <SelectTrigger
                          id="detail-publish-webhook"
                          className="w-full"
                        >
                          <SelectValue
                            placeholder={
                              isLoadingIntegrations
                                ? "Loading webhooks..."
                                : "Choose webhook"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {integrations?.map((integration) => (
                            <SelectItem
                              key={integration.id}
                              value={integration.id}
                            >
                              {integration.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {!hasIntegration && !isLoadingIntegrations ? (
                      <p className="text-xs leading-5 text-amber-700">
                        Configure a webhook integration before publishing.
                      </p>
                    ) : null}
                    <div className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          Submit to IndexNow
                        </p>
                        <p className="mt-1 text-xs leading-5 text-gray-500">
                          Send the returned publishedUrl to IndexNow after
                          webhook publish succeeds.
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={submitToIndexNow}
                        className={cn(
                          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                          submitToIndexNow ? "bg-gray-900" : "bg-gray-200",
                        )}
                        onClick={() =>
                          setSubmitToIndexNow((current) => !current)
                        }
                      >
                        <span
                          className={cn(
                            "absolute top-1 size-4 rounded-full bg-white shadow-sm transition-all",
                            submitToIndexNow ? "left-6" : "left-1",
                          )}
                        />
                        <span className="sr-only">Submit to IndexNow</span>
                      </button>
                    </div>
                    <Button
                      type="button"
                      className="w-full rounded-lg bg-gray-900 text-white hover:bg-gray-800"
                      disabled={
                        publishMutation.isPending ||
                        isLoadingIntegrations ||
                        !publishIntegrationId
                      }
                      onClick={() => publishMutation.mutate()}
                    >
                      <SparkleIcon aria-hidden="true" className="size-3.5" />
                      {publishMutation.isPending
                        ? "Publishing..."
                        : "Publish to webhook"}
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="rounded-lg border border-gray-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Source request</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap break-words rounded-lg bg-gray-950 p-3 text-xs leading-5 text-gray-100">
                  <code>{JSON.stringify(draft.source, null, 2)}</code>
                </pre>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete generated draft?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{draft.title}&quot; from the
              draft list. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteDraftMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDraftMutation.mutate(draft.id)}
              disabled={deleteDraftMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteDraftMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export { ContentGeneratorDraftDetail };
