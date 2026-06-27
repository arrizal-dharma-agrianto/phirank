"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useResetPassword } from "../hooks";
import { resetPasswordSchema, type ResetPasswordInput } from "../schemas";

const ResetPasswordForm = () => {
  const searchParams = useSearchParams();
  const resetPasswordMutation = useResetPassword();

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: searchParams.get("email") ?? "",
      resetToken: searchParams.get("token") ?? "",
      password: "",
      confirmPassword: "",
    },
  });

  const errors = form.formState.errors;

  const onSubmit = async (values: ResetPasswordInput) => {
    await resetPasswordMutation.mutateAsync(values);
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>New password</CardTitle>
      </CardHeader>
      <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent>
          <div className="flex flex-col gap-6">
            <Input type="hidden" {...form.register("email")} />
            <Input type="hidden" {...form.register("resetToken")} />

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
            disabled={resetPasswordMutation.isPending}
            className="w-full"
          >
            {resetPasswordMutation.isPending
              ? "Resetting..."
              : "Reset password"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export { ResetPasswordForm };
