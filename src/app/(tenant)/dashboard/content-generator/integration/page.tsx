import type { Metadata } from "next";

import { ContentGeneratorIntegration } from "@/modules/content-generator";

export const metadata: Metadata = {
  title: "Content Generator Integration",
  description: "Manage website integrations for the content generator API.",
};

const Page = () => {
  return <ContentGeneratorIntegration />;
};

export default Page;
