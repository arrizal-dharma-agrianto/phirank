import { RegisterForm } from "@/modules/auth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register",
  description: "Create an account to access your SaaS workspace.",
};

const Page = () => {
  return <RegisterForm />;
};

export default Page;
