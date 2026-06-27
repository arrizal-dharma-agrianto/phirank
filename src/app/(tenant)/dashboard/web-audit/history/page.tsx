import type { Metadata } from "next";

import { AuditHistory } from "@/modules/web-audit/components/audit-history";

export const metadata: Metadata = {
  title: "Web Audit History",
  description: "Review saved website audit snapshots.",
};

const Page = () => {
  return <AuditHistory />;
};

export default Page;
