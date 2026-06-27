import type { Metadata } from "next";

import { AuditDetail } from "@/modules/web-audit/components/audit-detail";

type PageProps = {
  params: Promise<{
    "audit-id": string;
  }>;
};

export const metadata: Metadata = {
  title: "Web Audit Detail",
  description: "Review a saved website audit snapshot.",
};

const Page = async ({ params }: PageProps) => {
  const { "audit-id": auditId } = await params;

  return <AuditDetail auditId={auditId} />;
};

export default Page;
