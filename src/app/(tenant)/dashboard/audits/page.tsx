import { redirect } from "next/navigation";

const Page = async () => {
  redirect("/dashboard/web-audit/history");
};

export default Page;
