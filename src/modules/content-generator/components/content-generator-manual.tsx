"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ClipboardTextIcon,
  SparkleIcon,
  TextAaIcon,
} from "@phosphor-icons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useActiveTenant } from "@/modules/tenant/hooks";

import {
  contentGeneratorSchema,
  type ContentGeneratorInput,
} from "../schemas";
import {
  generateContent,
  getContentGeneratorIntegrations,
  publishGeneratedContent,
} from "../services";
import type { GeneratedContent } from "../types";
import { ContentGeneratorStructuredContent } from "./content-generator-structured-content";

const contentTypeOptions = [
  { value: "blogArticle", label: "Artikel blog panjang" },
  { value: "landingPage", label: "Landing page" },
  { value: "faqPage", label: "FAQ page" },
  { value: "productDescription", label: "Product description" },
] satisfies Array<{ value: ContentGeneratorInput["contentType"]; label: string }>;

const toneOptions = [
  { value: "conversational", label: "Conversational" },
  { value: "trustworthy", label: "Trustworthy" },
  { value: "expert", label: "Expert" },
  { value: "friendly", label: "Friendly" },
  { value: "persuasive", label: "Persuasive" },
] satisfies Array<{ value: ContentGeneratorInput["tone"]; label: string }>;

const pronounOptions = [
  { value: "kamu", label: "kamu" },
  { value: "anda", label: "Anda" },
  { value: "mixed", label: "Pilih otomatis" },
] satisfies Array<{
  value: ContentGeneratorInput["pronounStyle"];
  label: string;
}>;

const ContentGeneratorManual = () => {
  const { activeTenantId } = useActiveTenant();
  const queryClient = useQueryClient();
  const [result, setResult] = useState<GeneratedContent | null>(null);
  const [generatedSource, setGeneratedSource] =
    useState<ContentGeneratorInput | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishErrorMessage, setPublishErrorMessage] = useState<string | null>(
    null,
  );
  const [publishSuccessMessage, setPublishSuccessMessage] = useState<
    string | null
  >(null);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState("");
  const [submitToIndexNow, setSubmitToIndexNow] = useState(true);

  const { data: integrations, isLoading: isLoadingIntegrations } = useQuery({
    queryKey: ["content-generator-integrations", activeTenantId],
    queryFn: getContentGeneratorIntegrations,
    enabled: !!activeTenantId,
  });
  const publishIntegrationId =
    selectedIntegrationId || integrations?.[0]?.id || "";

  const form = useForm<ContentGeneratorInput>({
    mode: "onChange",
    resolver: zodResolver(contentGeneratorSchema),
    defaultValues: {
      topic: "",
      contentType: "blogArticle",
      tone: "trustworthy",
      pronounStyle: "anda",
      targetKeyword: "",
      wordCount: 1800,
      audience: "",
      secondaryKeywords: "",
      contentTags: "",
      brandContext: "",
    },
  });

  const onSubmit = async (values: ContentGeneratorInput) => {
    setIsGenerating(true);
    setErrorMessage(null);
    setPublishErrorMessage(null);
    setPublishSuccessMessage(null);

    try {
      const data = await generateContent(values);
      setResult(data);
      setGeneratedSource(values);
      queryClient.invalidateQueries({
        queryKey: ["content-generator-drafts", activeTenantId],
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to generate content.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.content) return;

    await navigator.clipboard.writeText(result.content);
  };

  const handlePublish = async () => {
    if (!result?.content || !generatedSource || !publishIntegrationId) return;

    setIsPublishing(true);
    setPublishErrorMessage(null);
    setPublishSuccessMessage(null);

    try {
      const delivery = await publishGeneratedContent({
        integrationId: publishIntegrationId,
        contentId: result.id,
        content: result.content,
        model: result.model,
        source: generatedSource,
        submitToIndexNow,
      });
      setResult((current) =>
        current
          ? { ...current, status: delivery.contentStatus ?? current.status }
          : current,
      );
      queryClient.invalidateQueries({
        queryKey: ["content-generator-drafts", activeTenantId],
      });
      queryClient.invalidateQueries({
        queryKey: ["content-generator-draft", result.id],
      });

      setPublishSuccessMessage(
        [
          `Published to webhook. Delivery ${delivery.deliveryId} returned HTTP ${delivery.status}.`,
          delivery.indexNow
            ? delivery.indexNow.status === "submitted"
              ? `IndexNow submitted ${delivery.indexNow.submittedUrl}.`
              : `IndexNow ${delivery.indexNow.status}: ${delivery.indexNow.message}`
            : null,
        ]
          .filter(Boolean)
          .join(" "),
      );
    } catch (error) {
      setPublishErrorMessage(
        error instanceof Error ? error.message : "Failed to publish content.",
      );
      queryClient.invalidateQueries({
        queryKey: ["content-generator-drafts", activeTenantId],
      });
      queryClient.invalidateQueries({
        queryKey: ["content-generator-draft", result.id],
      });
    } finally {
      setIsPublishing(false);
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
            Generator konten SEO Indonesia
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Generate artikel, landing page, FAQ, dan deskripsi produk yang
            terasa natural untuk pembaca Indonesia menggunakan website yang
            sudah dikonfigurasi di workspace.
          </p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card className="rounded-lg border border-gray-100 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <SparkleIcon aria-hidden="true" className="size-4" />
              Generator settings
            </CardTitle>
            <CardDescription>
              Provide enough context for a focused first draft.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid gap-2">
                <Label htmlFor="topic">Brief konten</Label>
                <Textarea
                  id="topic"
                  placeholder="Contoh: Artikel edukasi tentang audit website untuk pemilik UMKM yang ingin meningkatkan performa SEO."
                  className="min-h-24 resize-none"
                  aria-invalid={!!form.formState.errors.topic}
                  {...form.register("topic")}
                />
                {form.formState.errors.topic ? (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.topic.message}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="contentType">Jenis konten</Label>
                  <Select
                    defaultValue={form.getValues("contentType")}
                    onValueChange={(value) =>
                      form.setValue(
                        "contentType",
                        value as ContentGeneratorInput["contentType"],
                        { shouldDirty: true, shouldValidate: true },
                      )
                    }
                  >
                    <SelectTrigger id="contentType" className="w-full">
                      <SelectValue placeholder="Select content type" />
                    </SelectTrigger>
                    <SelectContent>
                      {contentTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="tone">Tone of voice</Label>
                  <Select
                    defaultValue={form.getValues("tone")}
                    onValueChange={(value) =>
                      form.setValue(
                        "tone",
                        value as ContentGeneratorInput["tone"],
                        { shouldDirty: true, shouldValidate: true },
                      )
                    }
                  >
                    <SelectTrigger id="tone" className="w-full">
                      <SelectValue placeholder="Select tone" />
                    </SelectTrigger>
                    <SelectContent>
                      {toneOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="targetKeyword">
                    Target keyword utama (opsional)
                  </Label>
                  <Input
                    id="targetKeyword"
                    placeholder="Contoh: jasa audit website"
                    aria-invalid={!!form.formState.errors.targetKeyword}
                    {...form.register("targetKeyword")}
                  />
                  {form.formState.errors.targetKeyword ? (
                    <p className="text-xs text-red-500">
                      {form.formState.errors.targetKeyword.message}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="wordCount">Target jumlah kata</Label>
                  <Input
                    id="wordCount"
                    type="number"
                    min={1500}
                    max={3000}
                    step={100}
                    aria-invalid={!!form.formState.errors.wordCount}
                    {...form.register("wordCount", { valueAsNumber: true })}
                  />
                  {form.formState.errors.wordCount ? (
                    <p className="text-xs text-red-500">
                      {form.formState.errors.wordCount.message}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="pronounStyle">Sapaan pembaca</Label>
                  <Select
                    defaultValue={form.getValues("pronounStyle")}
                    onValueChange={(value) =>
                      form.setValue(
                        "pronounStyle",
                        value as ContentGeneratorInput["pronounStyle"],
                        { shouldDirty: true, shouldValidate: true },
                      )
                    }
                  >
                    <SelectTrigger id="pronounStyle" className="w-full">
                      <SelectValue placeholder="Pilih sapaan" />
                    </SelectTrigger>
                    <SelectContent>
                      {pronounOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="secondaryKeywords">Keyword turunan</Label>
                  <Input
                    id="secondaryKeywords"
                    placeholder="Contoh: audit SEO, kecepatan website, optimasi halaman"
                    {...form.register("secondaryKeywords")}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="contentTags">Tag konten yang bisa dipakai</Label>
                <Input
                  id="contentTags"
                  placeholder="Contoh: seo, audit website, umkm, performa website"
                  aria-invalid={!!form.formState.errors.contentTags}
                  {...form.register("contentTags")}
                />
                {form.formState.errors.contentTags ? (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.contentTags.message}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="audience">Audiens Indonesia</Label>
                <Input
                  id="audience"
                  placeholder="Contoh: pemilik UMKM, founder SaaS, marketer in-house"
                  {...form.register("audience")}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="brandContext">Konteks brand/produk</Label>
                <Textarea
                  id="brandContext"
                  placeholder="Contoh: Brand menyediakan audit website otomatis untuk bisnis lokal Indonesia, fokus pada SEO, performa, dan rekomendasi actionable."
                  className="min-h-20 resize-none"
                  {...form.register("brandContext")}
                />
              </div>

              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs text-gray-500">
                Internal link otomatis diambil dari crawled pages terbaru di
                workspace ini.
              </div>

              {errorMessage ? (
                <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-700">
                  {errorMessage}
                </div>
              ) : null}

              <Button
                type="submit"
                className="w-full rounded-lg bg-gray-900 text-white hover:bg-gray-800 sm:w-fit"
                disabled={isGenerating || !form.formState.isValid}
              >
                <SparkleIcon aria-hidden="true" className="size-3.5" />
                {isGenerating ? "Generating..." : "Generate content"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-lg border border-gray-100 shadow-sm">
          <CardHeader className="gap-3 sm:flex sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <TextAaIcon aria-hidden="true" className="size-4" />
                Generated draft
              </CardTitle>
              <CardDescription>
                Review and edit before publishing.
              </CardDescription>
            </div>
            {result ? (
              <Badge variant="outline" className="rounded-lg text-gray-500">
                {result.model}
              </Badge>
            ) : null}
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="grid gap-3">
                <div className="max-h-[560px] overflow-auto rounded-lg border border-gray-100 p-3">
                  <ContentGeneratorStructuredContent
                    content={result.structuredContent}
                  />
                </div>
                <div className="grid gap-3 rounded-lg border border-gray-100 p-3">
                  <div className="grid gap-2">
                    <Label htmlFor="publish-webhook">Publish webhook</Label>
                    <Select
                      value={publishIntegrationId}
                      onValueChange={setSelectedIntegrationId}
                      disabled={isLoadingIntegrations || !integrations?.length}
                    >
                      <SelectTrigger id="publish-webhook" className="w-full">
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
                    {integrations?.length ? (
                      <p className="text-xs text-gray-500">
                        The final content will be sent to the selected client
                        webhook.
                      </p>
                    ) : (
                      <p className="text-xs text-amber-700">
                        Configure a webhook integration before publishing.
                      </p>
                    )}
                  </div>

                  {publishErrorMessage ? (
                    <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-700">
                      {publishErrorMessage}
                    </div>
                  ) : null}

                  {publishSuccessMessage ? (
                    <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-700">
                      {publishSuccessMessage}
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Submit to IndexNow
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Send the returned publishedUrl to IndexNow after
                        webhook publish succeeds.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={submitToIndexNow}
                      className={cn(
                        "relative h-6 w-11 shrink-0 rounded-full transition",
                        submitToIndexNow ? "bg-gray-900" : "bg-gray-200",
                      )}
                      onClick={() => setSubmitToIndexNow((current) => !current)}
                    >
                      <span
                        className={cn(
                          "absolute top-1 size-4 rounded-full bg-white transition",
                          submitToIndexNow ? "left-6" : "left-1",
                        )}
                      />
                    </button>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      className="w-full rounded-lg bg-gray-900 text-white hover:bg-gray-800 sm:w-fit"
                      disabled={
                        isPublishing ||
                        !publishIntegrationId ||
                        !integrations?.length
                      }
                      onClick={handlePublish}
                    >
                      <SparkleIcon aria-hidden="true" className="size-3.5" />
                      {isPublishing ? "Publishing..." : "Publish to webhook"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full rounded-lg sm:w-fit"
                      onClick={handleCopy}
                    >
                      <ClipboardTextIcon
                        aria-hidden="true"
                        className="size-3.5"
                      />
                      Copy draft
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center">
                <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-lg bg-gray-100">
                  <TextAaIcon
                    aria-hidden="true"
                    className="size-5 text-gray-500"
                  />
                </div>
                <p className="text-sm font-medium text-gray-900">
                  No draft yet
                </p>
                <p className="mx-auto mt-1 max-w-md text-xs text-gray-500">
                  Generated content will appear here after Groq returns a
                  response.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export { ContentGeneratorManual };
