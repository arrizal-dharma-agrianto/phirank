import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{
    "audit-id": string;
  }>;
};

const Page = async ({ params }: PageProps) => {
  const { "audit-id": auditId } = await params;

  redirect(`/dashboard/web-audit/history/${auditId}`);
};

export default Page;
