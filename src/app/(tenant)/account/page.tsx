import { Account } from "@/modules/user";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account",
  description: "Manage your profile and account security settings.",
};

const Page = () => {
  return (
    <main className="flex flex-col items-center justify-center h-full">
      <Account />
    </main>
  );
};

export default Page;
