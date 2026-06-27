"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ClipboardTextIcon,
  SparkleIcon,
  TextAaIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
import { useActiveTenant } from "@/modules/tenant/hooks";

import {
  contentGeneratorIntegrationSchema,
  type ContentGeneratorIntegrationInput,
} from "../schemas";
import {
  createContentGeneratorIntegration,
  deleteContentGeneratorIntegration,
  getContentGeneratorIntegrations,
} from "../services";
import type { CreatedContentGeneratorIntegration } from "../types";

const ContentGeneratorIntegration = () => {
  const { activeTenantId } = useActiveTenant();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdIntegration, setCreatedIntegration] =
    useState<CreatedContentGeneratorIntegration | null>(null);
  const [isCreatingIntegration, setIsCreatingIntegration] = useState(false);
  const [deletingIntegrationId, setDeletingIntegrationId] = useState<
    string | null
  >(null);
  const queryClient = useQueryClient();
  const form = useForm<ContentGeneratorIntegrationInput>({
    mode: "onChange",
    resolver: zodResolver(contentGeneratorIntegrationSchema),
    defaultValues: {
      name: "",
      webhookUrl: "",
    },
  });
  const { data: integrations, isLoading: isLoadingIntegrations } = useQuery({
    queryKey: ["content-generator-integrations", activeTenantId],
    queryFn: getContentGeneratorIntegrations,
    enabled: !!activeTenantId,
  });
const integrationSnippet = `import { createHmac, timingSafeEqual } from "node:crypto";

const verifyPhirankWebhook = (rawBody, headers, secret) => {
  const timestamp = headers.get("x-phirank-timestamp");
  const signature = headers.get("x-phirank-signature")?.replace("sha256=", "");

  if (!timestamp || !signature) return false;

  const expected = createHmac("sha256", secret)
    .update(\`\${timestamp}.\${rawBody}\`)
    .digest("hex");

  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
};

export async function POST(req) {
  const rawBody = await req.text();

  if (
    !verifyPhirankWebhook(
      rawBody,
      req.headers,
      process.env.PHIRANK_WEBHOOK_SECRET
    )
  ) {
    return new Response("Invalid signature", { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  // payload.content is structured:
  // {
  //   title, description, slug, strategySummary,
  //   mainContent, internalLinks, imageAltTexts, faq, seoNotes, raw
  // }
  const publishedUrl = await publishToCms(payload.content);

  return Response.json({
    received: true,
    publishedUrl,
  });
}`;

  const handleCopyWebhookSecret = async () => {
    if (!createdIntegration?.webhookSecret) return;

    await navigator.clipboard.writeText(createdIntegration.webhookSecret);
  };

  const handleCreateIntegration = async (
    values: ContentGeneratorIntegrationInput,
  ) => {
    setIsCreatingIntegration(true);
    setErrorMessage(null);
    setCreatedIntegration(null);

    try {
      const integration = await createContentGeneratorIntegration(values);
      setCreatedIntegration(integration);
      form.reset();
      queryClient.invalidateQueries({
        queryKey: ["content-generator-integrations", activeTenantId],
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to create integration.",
      );
    } finally {
      setIsCreatingIntegration(false);
    }
  };

  const handleDeleteIntegration = async (integrationId: string) => {
    setDeletingIntegrationId(integrationId);
    setErrorMessage(null);

    try {
      await deleteContentGeneratorIntegration(integrationId);
      queryClient.invalidateQueries({
        queryKey: ["content-generator-integrations", activeTenantId],
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to delete integration.",
      );
    } finally {
      setDeletingIntegrationId(null);
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
          Content Generator
        </p>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-gray-950">
            Webhook integration
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-gray-500">
            Configure where phirank should publish generated content after you
            review the preview and click publish.
          </p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <Card className="rounded-lg border border-gray-100 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <SparkleIcon aria-hidden="true" className="size-4" />
              Add webhook
            </CardTitle>
            <CardDescription>
              Enter the client endpoint that will receive published content.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4"
              onSubmit={form.handleSubmit(handleCreateIntegration)}
            >
              <div className="grid gap-2">
                <Label htmlFor="integration-name">Integration name</Label>
                <Input
                  id="integration-name"
                  placeholder="Example: Client CMS"
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
                <Label htmlFor="webhook-url">Webhook URL</Label>
                <Input
                  id="webhook-url"
                  type="text"
                  placeholder="localhost:3001/api/webhooks/phirank"
                  aria-invalid={!!form.formState.errors.webhookUrl}
                  {...form.register("webhookUrl")}
                />
                {form.formState.errors.webhookUrl ? (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.webhookUrl.message}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500">
                    phirank will POST the final content to this endpoint when
                    you click publish. Local URLs like localhost:3001 are saved
                    with http:// for development.
                  </p>
                )}
              </div>

              {errorMessage ? (
                <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-700">
                  {errorMessage}
                </div>
              ) : null}

              <Button
                type="submit"
                className="w-full rounded-lg bg-gray-900 text-white hover:bg-gray-800 sm:w-fit"
                disabled={isCreatingIntegration || !form.formState.isValid}
              >
                <SparkleIcon aria-hidden="true" className="size-3.5" />
                {isCreatingIntegration ? "Creating..." : "Create webhook"}
              </Button>
            </form>

            {createdIntegration ? (
              <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50 p-3">
                <p className="text-xs font-medium text-amber-900">
                  Copy this webhook secret now. It will not be shown again.
                </p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <code className="min-w-0 flex-1 overflow-auto rounded bg-white px-2 py-2 text-xs text-gray-800">
                    {createdIntegration.webhookSecret}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-lg"
                    onClick={handleCopyWebhookSecret}
                  >
                    <ClipboardTextIcon
                      aria-hidden="true"
                      className="size-3.5"
                    />
                    Copy secret
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="mt-5 rounded-lg border border-gray-100 p-3">
              <p className="text-sm font-medium text-gray-900">
                Configured webhooks
              </p>
              <div className="mt-3 grid gap-2">
                {isLoadingIntegrations ? (
                  <p className="text-xs text-gray-500">Loading webhooks...</p>
                ) : integrations?.length ? (
                  integrations.map((integration) => (
                    <div
                      key={integration.id}
                      className="flex flex-col gap-2 rounded-lg border border-gray-100 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {integration.name}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          {integration.webhookUrl}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                        aria-label={`Delete ${integration.name} webhook`}
                        disabled={deletingIntegrationId === integration.id}
                        onClick={() => handleDeleteIntegration(integration.id)}
                      >
                        <TrashIcon aria-hidden="true" className="size-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="rounded-lg border border-dashed border-gray-200 p-3 text-xs text-gray-500">
                    No webhooks are configured yet.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg border border-gray-100 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TextAaIcon aria-hidden="true" className="size-4" />
              Publish guide
            </CardTitle>
            <CardDescription>
              Verify the signature before accepting published content.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-sm font-medium text-gray-900">
                  Webhook payload
                </p>
                <div className="mt-2 grid gap-2 rounded bg-gray-50 px-2 py-2 text-xs leading-5 text-gray-700">
                  <code>event: content.generated</code>
                  <code>content.title</code>
                  <code>content.description</code>
                  <code>content.slug</code>
                  <code>content.mainContent</code>
                  <code>content.faq</code>
                  <code>content.raw</code>
                </div>
                <p className="mt-2 text-xs leading-5 text-gray-500">
                  Signed headers: <code>x-phirank-signature</code>,{" "}
                  <code>x-phirank-timestamp</code>, and{" "}
                  <code>x-phirank-delivery-id</code>.
                </p>
              </div>

              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-sm font-medium text-gray-900">
                  Required response
                </p>
                <pre className="mt-2 whitespace-pre-wrap break-words rounded bg-gray-50 px-2 py-2 text-xs leading-5 text-gray-700">
                  <code>{`{
  "received": true,
  "publishedUrl": "https://client-site.com/article-slug"
}`}</code>
                </pre>
                <p className="mt-2 text-xs leading-5 text-gray-500">
                  Return the final public website URL in{" "}
                  <code>publishedUrl</code>. phirank will use this URL for
                  indexing workflows such as IndexNow later.
                </p>
              </div>

              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-sm font-medium text-gray-900">
                  Client handler example
                </p>
                <pre className="mt-2 max-h-80 overflow-auto rounded bg-gray-950 p-3 text-xs leading-5 text-gray-100">
                  <code>{integrationSnippet}</code>
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export { ContentGeneratorIntegration };
