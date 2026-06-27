import { CrawlPageDetail } from "@/modules/data-audit-crawler";

type CrawlPageDetailPageProps = {
  params: Promise<{
    "website-id": string;
    "page-id": string;
  }>;
};

export default async function CrawlPageDetailPage({
  params,
}: CrawlPageDetailPageProps) {
  const { "website-id": websiteId, "page-id": pageId } = await params;

  return <CrawlPageDetail websiteId={websiteId} pageId={pageId} />;
}
