import { DataAuditCrawlerDetail } from "@/modules/data-audit-crawler";

type DataAuditCrawlerDetailPageProps = {
  params: Promise<{
    "website-id": string;
  }>;
};

export default async function DataAuditCrawlerDetailPage({
  params,
}: DataAuditCrawlerDetailPageProps) {
  const { "website-id": websiteId } = await params;

  return <DataAuditCrawlerDetail websiteId={websiteId} />;
}
