import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";

import { dataForSeoClient } from "./dataforseo.client";
import { crawleeClient } from "./crawlee.client";
import { processCrawlResult } from "./crawl-result-processor.service";

type CrawlJobRow = {
  id: string;
  website_id: string;
  provider_task_id: string | null;
  provider: string;
  status: string;
  max_crawl_pages: number;
  start_url: string;
  domain: string;
};

const getJobForProcessing = async (crawlJobId: string) => {
  const jobs = await prisma.$queryRaw<CrawlJobRow[]>`
    SELECT
      crawl_jobs.id,
      crawl_jobs.website_id,
      crawl_jobs.provider_task_id,
      crawl_jobs.provider,
      crawl_jobs.status,
      crawl_jobs.max_crawl_pages,
      websites.start_url,
      websites.domain
    FROM crawl_jobs
    INNER JOIN websites ON websites.id = crawl_jobs.website_id
    WHERE crawl_jobs.id = ${crawlJobId}
    LIMIT 1
  `;

  return jobs[0] ?? null;
};

const createCrawlJob = async (websiteId: string, maxCrawlPages: number) => {
  const now = new Date();
  const id = randomUUID();
  const provider =
    process.env.DATA_AUDIT_CRAWLER_PROVIDER === "crawlee"
      ? "crawlee"
      : "dataforseo";

  await prisma.$executeRaw`
    INSERT INTO crawl_jobs (
      id,
      website_id,
      provider,
      status,
      max_crawl_pages,
      created_at,
      updated_at
    )
    VALUES (
      ${id},
      ${websiteId},
      ${provider},
      'pending',
      ${maxCrawlPages},
      ${now},
      ${now}
    )
  `;

  await prisma.$executeRaw`
    UPDATE websites
    SET crawl_status = 'pending',
        updated_at = ${now}
    WHERE id = ${websiteId}
  `;

  return id;
};

const markFailed = async (
  crawlJobId: string,
  websiteId: string,
  errorMessage: string,
) => {
  const now = new Date();

  await prisma.$executeRaw`
    UPDATE crawl_jobs
    SET status = 'failed',
        error_message = ${errorMessage},
        finished_at = ${now},
        elapsed_time_ms = GREATEST(
          0,
          FLOOR(EXTRACT(EPOCH FROM (${now}::timestamp - COALESCE(started_at, created_at))) * 1000)::integer
        ),
        updated_at = ${now}
    WHERE id = ${crawlJobId}
  `;

  await prisma.$executeRaw`
    UPDATE websites
    SET crawl_status = 'failed',
        updated_at = ${now}
    WHERE id = ${websiteId}
  `;
};

const startCrawlJob = async (crawlJobId: string) => {
  const job = await getJobForProcessing(crawlJobId);

  if (!job) {
    throw new Error("Crawl job not found.");
  }

  try {
    const rawRequest = {
      target: job.domain,
      startUrl: job.start_url,
      maxCrawlPages: job.max_crawl_pages,
      provider: job.provider,
    };

    if (job.provider === "crawlee") {
      const now = new Date();

      await prisma.$executeRaw`
        UPDATE crawl_jobs
        SET status = 'running',
            started_at = ${now},
            raw_request = ${rawRequest},
            updated_at = ${now}
        WHERE id = ${crawlJobId}
      `;

      await prisma.$executeRaw`
        UPDATE websites
        SET crawl_status = 'running',
            updated_at = ${now}
        WHERE id = ${job.website_id}
      `;

      return;
    }

    const task = await dataForSeoClient.createOnPageTask(rawRequest);

    if (!task.id) {
      throw new Error("DataForSEO did not return a task id.");
    }

    const now = new Date();

    await prisma.$executeRaw`
      UPDATE crawl_jobs
      SET status = 'running',
          provider_task_id = ${task.id},
          started_at = ${now},
          raw_request = ${rawRequest},
          raw_response = ${task.raw},
          updated_at = ${now}
      WHERE id = ${crawlJobId}
    `;

    await prisma.$executeRaw`
      UPDATE websites
      SET crawl_status = 'running',
          updated_at = ${now}
      WHERE id = ${job.website_id}
    `;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to start crawl job.";

    await markFailed(crawlJobId, job.website_id, errorMessage);
  }
};

const isTaskFinished = (summaryRaw: unknown) => {
  if (!summaryRaw || typeof summaryRaw !== "object") return false;

  const task = Array.isArray((summaryRaw as { tasks?: unknown }).tasks)
    ? ((summaryRaw as { tasks: unknown[] }).tasks[0] as Record<string, unknown>)
    : null;
  const result = Array.isArray(task?.result)
    ? (task.result[0] as Record<string, unknown>)
    : null;
  const crawlProgress =
    result && typeof result.crawl_progress === "object"
      ? (result.crawl_progress as Record<string, unknown>)
      : {};
  const status = String(
    crawlProgress.status ?? result?.crawl_status ?? task?.status_message ?? "",
  ).toLowerCase();
  const pagesInQueue = Number(crawlProgress.pages_in_queue);
  const pagesCrawled = Number(crawlProgress.pages_crawled);
  const hasCrawlProgress =
    Number.isFinite(pagesInQueue) || Number.isFinite(pagesCrawled);

  if (
    status.includes("finished") ||
    status.includes("completed") ||
    status.includes("done")
  ) {
    return true;
  }

  return hasCrawlProgress && pagesInQueue === 0 && pagesCrawled > 0;
};

const pollCrawlJob = async (crawlJobId: string) => {
  const job = await getJobForProcessing(crawlJobId);

  if (!job || job.status !== "running") {
    return;
  }

  try {
    if (job.provider === "crawlee") {
      const { summaryRaw, pagesRaw, linksRaw } = await crawleeClient.runCrawl({
        startUrl: job.start_url,
        domain: job.domain,
        maxCrawlPages: job.max_crawl_pages,
      });

      await processCrawlResult({
        websiteId: job.website_id,
        crawlJobId: job.id,
        summaryRaw,
        pagesRaw,
        linksRaw,
      });

      const now = new Date();

      await prisma.$executeRaw`
        UPDATE crawl_jobs
        SET status = 'completed',
            finished_at = ${now},
            elapsed_time_ms = GREATEST(
              0,
              FLOOR(EXTRACT(EPOCH FROM (${now}::timestamp - COALESCE(started_at, created_at))) * 1000)::integer
            ),
            raw_response = ${summaryRaw},
            updated_at = ${now}
        WHERE id = ${crawlJobId}
      `;

      await prisma.$executeRaw`
        UPDATE websites
        SET crawl_status = 'completed',
            current_crawl_job_id = ${crawlJobId},
            last_crawled_at = ${now},
            updated_at = ${now}
        WHERE id = ${job.website_id}
      `;

      return;
    }

    if (!job.provider_task_id) {
      throw new Error("DataForSEO task id is missing.");
    }

    const summaryRaw = await dataForSeoClient.getOnPageSummary(
      job.provider_task_id,
    );

    if (!isTaskFinished(summaryRaw)) {
      return;
    }

    const [pagesRaw, linksRaw] = await Promise.all([
      dataForSeoClient.getOnPagePages(job.provider_task_id),
      dataForSeoClient.getOnPageLinks(job.provider_task_id),
    ]);

    await processCrawlResult({
      websiteId: job.website_id,
      crawlJobId: job.id,
      summaryRaw,
      pagesRaw,
      linksRaw,
    });

    const now = new Date();

    await prisma.$executeRaw`
      UPDATE crawl_jobs
      SET status = 'completed',
          finished_at = ${now},
          elapsed_time_ms = GREATEST(
            0,
            FLOOR(EXTRACT(EPOCH FROM (${now}::timestamp - COALESCE(started_at, created_at))) * 1000)::integer
          ),
          raw_response = ${summaryRaw},
          updated_at = ${now}
      WHERE id = ${crawlJobId}
    `;

    await prisma.$executeRaw`
      UPDATE websites
      SET crawl_status = 'completed',
          current_crawl_job_id = ${crawlJobId},
          last_crawled_at = ${now},
          updated_at = ${now}
      WHERE id = ${job.website_id}
    `;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to update crawl job.";

    await markFailed(crawlJobId, job.website_id, errorMessage);
  }
};

const pollRunningJobs = async (tenantId: string) => {
  const jobs = await prisma.$queryRaw<{ id: string }[]>`
    SELECT crawl_jobs.id
    FROM crawl_jobs
    INNER JOIN websites ON websites.id = crawl_jobs.website_id
    WHERE websites.tenant_id = ${tenantId}
      AND crawl_jobs.status = 'running'
      AND crawl_jobs.provider != 'crawlee'
    ORDER BY crawl_jobs.created_at DESC
    LIMIT 5
  `;

  await Promise.all(jobs.map((job) => pollCrawlJob(job.id)));
};

export { createCrawlJob, pollCrawlJob, pollRunningJobs, startCrawlJob };
