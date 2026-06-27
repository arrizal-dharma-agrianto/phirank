import { redirect } from "next/navigation";

const Page = async () => {
  redirect("/dashboard/content-generator/generate");
};

export default Page;
