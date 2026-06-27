import type { Metadata } from "next";

import { ContentGeneratorIndexNow } from "@/modules/content-generator";

export const metadata: Metadata = {
  title: "Content Generator IndexNow",
  description: "Configure IndexNow verification for published content.",
};

const Page = () => {
  return <ContentGeneratorIndexNow />;
};

export default Page;
