import { LoginForm } from "@/modules/auth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to your SaaS workspace.",
};

const Page = () => {
  return <LoginForm />;
};

export default Page;
