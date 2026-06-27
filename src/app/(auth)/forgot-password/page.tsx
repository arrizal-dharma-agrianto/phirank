import { ForgotPasswordForm } from "@/modules/auth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Request a password reset code for your account.",
};

const Page = () => <ForgotPasswordForm />;

export default Page;
