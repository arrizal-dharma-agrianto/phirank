import type { Metadata } from "next";

import { ContentGeneratorManual } from "@/modules/content-generator";

export const metadata: Metadata = {
  title: "Generate Content",
  description: "Generate marketing content drafts with Groq.",
};

const Page = () => {
  return <ContentGeneratorManual />;
};

export default Page;
