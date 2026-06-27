"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";

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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { ResendOtpButton } from "@/components/resend-otp-button";

import {
  useResendForgotPasswordOtp,
  useVerifyForgotPasswordOtp,
} from "../hooks";
import {
  verifyForgotPasswordOtpSchema,
  type VerifyForgotPasswordOtpInput,
} from "../schemas";

const ForgotPasswordOtpForm = () => {
  const searchParams = useSearchParams();
  const verifyOtpMutation = useVerifyForgotPasswordOtp();
  const resendOtpMutation = useResendForgotPasswordOtp();
  const email = searchParams.get("email") ?? "";

  const form = useForm<VerifyForgotPasswordOtpInput>({
    resolver: zodResolver(verifyForgotPasswordOtpSchema),
    defaultValues: {
      email,
      otp: "",
    },
  });

  const errors = form.formState.errors;

  const onSubmit = async (values: VerifyForgotPasswordOtpInput) => {
    await verifyOtpMutation.mutateAsync(values);
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Verify OTP</CardTitle>
        <CardAction>
          <Button asChild variant="link">
            <Link href="/forgot-password">Back</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent>
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" {...form.register("email")} disabled />
            </div>

            <div className="grid gap-2">
              <Controller
                name="otp"
                control={form.control}
                render={({ field }) => (
                  <InputOTP
                    maxLength={6}
                    value={field.value}
                    onChange={field.onChange}
                  >
                    <InputOTPGroup className="justify-center w-full">
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                )}
              />
              {errors.otp ? (
                <p className="text-xs text-destructive">
                  {errors.otp.message ?? "OTP must be 6 digits."}
                </p>
              ) : null}
              <ResendOtpButton
                disabled={!email || verifyOtpMutation.isPending}
                onResend={() =>
                  resendOtpMutation.mutateAsync({
                    email,
                  })
                }
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="mt-4 flex-col gap-2">
          <Button
            type="submit"
            disabled={verifyOtpMutation.isPending}
            className="w-full"
          >
            {verifyOtpMutation.isPending ? "Verifying..." : "Verify OTP"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export { ForgotPasswordOtpForm };
