"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { loginSchema, type LoginInput } from "../schemas";
import { useLogin } from "../hooks/use-login";
import { sanitizeCallbackUrl } from "../utils";
import { toast } from "sonner";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const loginMutation = useLogin();
  const callbackUrl = sanitizeCallbackUrl(searchParams.get("callbackUrl"));
  const registerHref =
    callbackUrl === "/dashboard"
      ? "/register"
      : `/register?${new URLSearchParams({ callbackUrl }).toString()}`;

  const getCallbackUrl = () => {
    const callbackUrl = new URLSearchParams(window.location.search).get(
      "callbackUrl",
    );

    if (!callbackUrl) return "/dashboard";

    if (callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")) {
      return callbackUrl;
    }

    try {
      const parsedUrl = new URL(callbackUrl);

      if (parsedUrl.origin !== window.location.origin) {
        return "/dashboard";
      }

      return `${parsedUrl.pathname}${parsedUrl.search}`;
    } catch {
      return "/dashboard";
    }
  };

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginInput) {
    try {
      await loginMutation.mutateAsync(values);

      toast.success("Login successful", {
        description: "You have been logged in.",
      });

      router.push(getCallbackUrl());
      router.refresh();
    } catch (error) {
      console.log(error);
      form.setError("root", {
        message:
          error instanceof Error
            ? error.message
            : "Login failed. Please try again.",
      });

      toast("Login failed. Please try again.", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  const errors = form.formState.errors;
  const isSubmitting = form.formState.isSubmitting;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Login to your account</CardTitle>
        <CardAction>
          <Button asChild variant="link">
            <Link href={registerHref}>Register</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent>
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Email"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
                {...form.register("email")}
              />
              {errors.email ? (
                <p id="email-error" className="text-xs text-destructive">
                  {errors.email.message ?? "Enter a valid email."}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="password">Password</Label>
                <Button asChild variant="link" className="h-auto p-0 text-xs">
                  <Link href="/forgot-password">Forgot password?</Link>
                </Button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Password"
                aria-invalid={!!errors.password}
                aria-describedby={
                  errors.password ? "password-error" : undefined
                }
                {...form.register("password")}
              />
              {errors.password ? (
                <p id="password-error" className="text-xs text-destructive">
                  {errors.password.message ?? "Password is required."}
                </p>
              ) : null}
            </div>
          </div>
        </CardContent>
        <CardFooter className="mt-4 flex-col gap-2">
          <Button type="submit" disabled={isSubmitting} className="w-full">
            Login
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() =>
              signIn("google", {
                callbackUrl: getCallbackUrl(),
              })
            }
          >
            Login with Google
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
