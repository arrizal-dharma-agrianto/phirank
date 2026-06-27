import type { Metadata } from "next";

import { ContentGeneratorDrafts } from "@/modules/content-generator";

export const metadata: Metadata = {
  title: "Generated Content Drafts",
  description: "Review generated content drafts and publish statuses.",
};

const Page = () => {
  return <ContentGeneratorDrafts />;
};

export default Page;
