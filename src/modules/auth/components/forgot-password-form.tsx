"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

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

import { useForgotPassword } from "../hooks";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "../schemas";

const ForgotPasswordForm = () => {
  const forgotPasswordMutation = useForgotPassword();
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const errors = form.formState.errors;

  const onSubmit = async (values: ForgotPasswordInput) => {
    await forgotPasswordMutation.mutateAsync(values);
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Forgot password</CardTitle>
        <CardAction>
          <Button asChild variant="link">
            <Link href="/login">Login</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent>
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
        </CardContent>
        <CardFooter className="mt-4 flex-col gap-2">
          <Button
            type="submit"
            disabled={forgotPasswordMutation.isPending}
            className="w-full"
          >
            {forgotPasswordMutation.isPending ? "Sending..." : "Send OTP"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export { ForgotPasswordForm };
