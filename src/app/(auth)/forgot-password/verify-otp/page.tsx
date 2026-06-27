import { ForgotPasswordOtpForm } from "@/modules/auth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verify Reset Code",
  description: "Verify the one-time code before resetting your password.",
};

const Page = () => {
  return <ForgotPasswordOtpForm />;
};

export default Page;
