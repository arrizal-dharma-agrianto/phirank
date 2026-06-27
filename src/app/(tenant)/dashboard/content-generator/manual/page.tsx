import { redirect } from "next/navigation";

const Page = () => {
  redirect("/dashboard/content-generator/generate");
};

export default Page;
