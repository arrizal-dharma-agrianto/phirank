import type { Metadata } from "next";

import { WebAuditDashboard } from "@/modules/web-audit/components/web-audit-dashboard";

export const metadata: Metadata = {
  title: "Web Audit Analyze",
  description: "Run a website audit and review the first analysis snapshot.",
};

const Page = () => {
  return <WebAuditDashboard />;
};

export default Page;
