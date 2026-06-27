import { ResetPasswordForm } from "@/modules/auth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Create a new password for your account.",
};

const Page = () => {
  return <ResetPasswordForm />;
};

export default Page;
