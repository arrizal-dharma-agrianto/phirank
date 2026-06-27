import { redirect } from "next/navigation";

const Page = async () => {
  redirect("/dashboard/data-audit-crawler");
};

export default Page;
