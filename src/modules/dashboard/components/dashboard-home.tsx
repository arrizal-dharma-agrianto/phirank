import {
  ChartLineUpIcon,
  GlobeSimpleIcon,
  ListChecksIcon,
  SparkleIcon,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const quickActions = [
  {
    title: "Analyze website",
    description: "Run a new website audit and monitor progress.",
    href: "/dashboard/web-audit/analyze",
    icon: GlobeSimpleIcon,
  },
  {
    title: "Audit history",
    description: "Review completed and failed website audit snapshots.",
    href: "/dashboard/web-audit/history",
    icon: ListChecksIcon,
  },
  {
    title: "Generate content",
    description: "Create Indonesian SEO content drafts with Groq.",
    href: "/dashboard/content-generator/manual",
    icon: SparkleIcon,
  },
] as const;

const DashboardHome = () => {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
          Dashboard
        </p>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-gray-950">
            Workspace overview
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Start common workflows from one place. Web Audit now lives in its
            own navigation group.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {quickActions.map((action) => {
          const Icon = action.icon;

          return (
            <Card
              key={action.href}
              className="rounded-lg border border-gray-100 shadow-sm"
            >
              <CardHeader>
                <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-gray-100">
                  <Icon aria-hidden="true" className="size-4 text-gray-700" />
                </div>
                <CardTitle>{action.title}</CardTitle>
                <CardDescription>{action.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  asChild
                  variant="outline"
                  className="w-full rounded-lg"
                >
                  <Link href={action.href}>Open</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="rounded-lg border border-gray-100 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChartLineUpIcon aria-hidden="true" className="size-4" />
            Next steps
          </CardTitle>
          <CardDescription>
            Add metrics here later when audit and content generation usage data
            are tracked.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
};

export { DashboardHome };
