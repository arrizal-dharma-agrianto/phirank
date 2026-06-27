import type { Metadata } from "next";

import { ContentGeneratorDraftDetail } from "@/modules/content-generator";

export const metadata: Metadata = {
  title: "Generated Content Detail",
  description: "Review a generated content draft.",
};

const Page = async ({
  params,
}: {
  params: Promise<{ "draft-id": string }>;
}) => {
  const draftId = (await params)["draft-id"];

  return <ContentGeneratorDraftDetail draftId={draftId} />;
};

export default Page;
