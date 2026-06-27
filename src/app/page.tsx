import { Button } from "@/components/ui/button";
import { getAppName } from "@/config";
import type { Metadata } from "next";
import Link from "next/link";

const appName = getAppName();

export const metadata: Metadata = {
  title: {
    absolute: `${appName} | SEO operating system for Indonesian teams`,
  },
  description:
    "Audit websites, crawl technical SEO data, and generate Indonesian SEO content from one workspace.",
};

const metrics = [
  ["10", "Pages crawled"],
  ["2", "Broken links"],
  ["4", "Missing meta"],
  ["30", "Internal links"],
];

const features = [
  {
    title: "Data audit crawler",
    description:
      "Crawl configured websites, store page-level SEO metrics, and inspect titles, H1, status codes, canonical URLs, links, images, and indexability.",
  },
  {
    title: "Web audit workflow",
    description:
      "Run structured web audits for performance, SEO, accessibility, and quality signals with a history your team can revisit.",
  },
  {
    title: "Content generator",
    description:
      "Generate Indonesian SEO drafts using the configured website and the latest crawled pages as internal link context.",
  },
  {
    title: "Webhook publishing",
    description:
      "Send approved generated drafts to client systems through named webhook integrations and keep delivery metadata traceable.",
  },
  {
    title: "Workspace controls",
    description:
      "Manage one active website per workspace, tenant membership, invitations, roles, permissions, and account settings.",
  },
  {
    title: "Crawler history",
    description:
      "Review crawl jobs, provider status, crawl limits, failures, and the latest saved page inventory without mixing old crawl results.",
  },
];

const workflow = [
  "Configure one workspace website",
  "Crawl pages and collect SEO data",
  "Inspect page details and audit signals",
  "Generate content with crawled internal links",
  "Publish through webhook integrations",
];

const Page = () => {
  return (
    <main className="min-h-screen bg-white text-gray-950">
      <section className="relative overflow-hidden border-b border-gray-100 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_70%)]">
        <div className="mx-auto grid min-h-[92vh] w-full max-w-7xl gap-10 px-5 py-6 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-8">
          <div className="flex min-h-[52vh] flex-col justify-center">
            <nav className="mb-10 flex items-center justify-between gap-4">
              <Link href="/" className="text-sm font-semibold text-gray-950">
                {appName}
              </Link>
              <div className="flex items-center gap-2">
                <Button asChild variant="ghost" className="rounded-lg">
                  <Link href="/login">Login</Link>
                </Button>
                <Button
                  asChild
                  className="rounded-lg bg-gray-950 text-white hover:bg-gray-800"
                >
                  <Link href="/register">Create account</Link>
                </Button>
              </div>
            </nav>

            <p className="text-xs font-medium uppercase tracking-widest text-gray-500">
              SEO workflow platform
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-gray-950 sm:text-5xl lg:text-6xl">
              Audit, crawl, and generate SEO content from one workspace.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-gray-600">
              {appName} connects technical crawling, web audits, Indonesian
              content generation, internal link context, and webhook publishing
              for teams managing client websites.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                className="h-10 rounded-lg bg-gray-950 px-4 text-white hover:bg-gray-800"
              >
                <Link href="/register">Start workspace</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-10 rounded-lg px-4"
              >
                <Link href="/login">Open dashboard</Link>
              </Button>
            </div>
          </div>

          <div className="relative min-h-[560px] lg:min-h-[640px]">
            <div className="absolute inset-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-950 shadow-2xl">
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-white/10 bg-gray-900 px-4 py-3">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-400">
                      Data audit crawler
                    </p>
                    <p className="mt-1 text-sm font-medium text-white">
                      phirank.io
                    </p>
                  </div>
                  <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
                    Completed
                  </span>
                </div>

                <div className="grid gap-4 p-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {metrics.map(([value, label]) => (
                      <div
                        key={label}
                        className="rounded-lg border border-white/10 bg-white/[0.06] p-4"
                      >
                        <p className="text-2xl font-semibold text-white">
                          {value}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">{label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white p-4 text-gray-950">
                    <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-semibold">Crawled pages</p>
                        <p className="mt-1 text-xs text-gray-500">
                          Search, filter, sort, and inspect page details.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <span className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-500">
                          2xx success
                        </span>
                        <span className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-500">
                          10 rows
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2">
                      {[
                        [
                          "/",
                          "200",
                          "SEO platform for Indonesian teams",
                          "1,840",
                        ],
                        ["/audit", "200", "Website audit workflow", "1,120"],
                        [
                          "/blog/internal-linking",
                          "200",
                          "Internal linking strategy",
                          "2,410",
                        ],
                        ["/pricing", "301", "Plans and workspace limits", "640"],
                      ].map(([url, status, title, words]) => (
                        <div
                          key={url}
                          className="grid grid-cols-[1.1fr_0.4fr_1.2fr_0.4fr] gap-3 rounded-lg bg-gray-50 px-3 py-3 text-xs"
                        >
                          <span className="truncate font-medium text-gray-900">
                            {url}
                          </span>
                          <span className="text-gray-500">{status}</span>
                          <span className="truncate text-gray-600">
                            {title}
                          </span>
                          <span className="text-right text-gray-500">
                            {words}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
                      <p className="text-sm font-medium text-white">
                        Content generator
                      </p>
                      <p className="mt-2 text-xs leading-5 text-gray-400">
                        Uses the configured website and latest crawled pages as
                        internal link context for Indonesian SEO drafts.
                      </p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
                      <p className="text-sm font-medium text-white">
                        Webhook publishing
                      </p>
                      <p className="mt-2 text-xs leading-5 text-gray-400">
                        Deliver approved content to client systems with named
                        integrations and delivery records.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-16 sm:px-8 lg:py-20">
        <div className="max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-widest text-gray-500">
            Product modules
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-gray-950">
            Built around the features already inside your dashboard.
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm"
            >
              <h3 className="text-base font-semibold text-gray-950">
                {feature.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-gray-600">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-gray-100 bg-gray-50">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-16 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:py-20">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-gray-500">
              Workflow
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-gray-950">
              From crawl data to publishable SEO content.
            </h2>
            <p className="mt-4 text-sm leading-6 text-gray-600">
              The crawler keeps internal link context grounded in real pages,
              then the content generator uses that context when drafting.
            </p>
          </div>
          <div className="grid gap-3">
            {workflow.map((step, index) => (
              <div
                key={step}
                className="flex items-center gap-4 rounded-lg border border-gray-100 bg-white p-4 shadow-sm"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-950 text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <p className="text-sm font-medium text-gray-900">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-5 py-16 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:py-20">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-gray-500">
            Ready for the dashboard
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-gray-950">
            Start with one configured website.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
            Create an account, configure the workspace website, crawl the latest
            pages, and use that data across audits and content generation.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            asChild
            className="h-10 rounded-lg bg-gray-950 px-4 text-white hover:bg-gray-800"
          >
            <Link href="/register">Create account</Link>
          </Button>
          <Button asChild variant="outline" className="h-10 rounded-lg px-4">
            <Link href="/login">Login</Link>
          </Button>
        </div>
      </section>
    </main>
  );
};

export default Page;
