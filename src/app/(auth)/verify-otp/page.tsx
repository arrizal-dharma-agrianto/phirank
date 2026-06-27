import { VerifyOtpForm } from "@/modules/auth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verify Account",
  description: "Verify your account with the one-time code.",
};

const Page = () => {
  return <VerifyOtpForm />;
};

export default Page;
