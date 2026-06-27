"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useRegister } from "../hooks/use-register";
import { registerSchema, type RegisterInput } from "../schemas";
import { sanitizeCallbackUrl } from "../utils";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export function RegisterForm() {
  const searchParams = useSearchParams();
  const registerMutation = useRegister();
  const callbackUrl = sanitizeCallbackUrl(searchParams.get("callbackUrl"));
  const loginHref =
    callbackUrl === "/dashboard"
      ? "/login"
      : `/login?${new URLSearchParams({ callbackUrl }).toString()}`;

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: RegisterInput) {
    await registerMutation.mutateAsync(values);
  }

  const errors = form.formState.errors;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardAction>
          <Button asChild variant="link">
            <Link href={loginHref}>Login</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent>
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="Name"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "name-error" : undefined}
                {...form.register("name")}
              />
              {errors.name ? (
                <p id="name-error" className="text-xs text-destructive">
                  {errors.name.message ?? "Name is required."}
                </p>
              ) : null}
            </div>

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
              <Label htmlFor="password">Password</Label>
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
                  {errors.password.message ??
                    "Password must be at least 8 characters."}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm Password"
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={
                  errors.confirmPassword ? "confirmPassword-error" : undefined
                }
                {...form.register("confirmPassword")}
              />
              {errors.confirmPassword ? (
                <p
                  id="confirmPassword-error"
                  className="text-xs text-destructive"
                >
                  {errors.confirmPassword.message ??
                    "Confirm password is required."}
                </p>
              ) : null}
            </div>
          </div>
        </CardContent>
        <CardFooter className="mt-4 flex-col gap-2">
          <Button
            type="submit"
            disabled={registerMutation.isPending}
            className="w-full"
          >
            Register
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() =>
              signIn("google", {
                callbackUrl,
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
