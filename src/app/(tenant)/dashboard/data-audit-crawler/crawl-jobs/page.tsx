import { CrawlJobHistory } from "@/modules/data-audit-crawler";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Crawl Job History",
  description: "Review and manage crawler job history for the workspace website.",
};

export default function CrawlJobHistoryPage() {
  return <CrawlJobHistory />;
}
