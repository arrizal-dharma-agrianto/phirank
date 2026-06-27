"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Controller, useForm } from "react-hook-form";

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { ResendOtpButton } from "@/components/resend-otp-button";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import {
  useResendVerificationOtp,
  useVerifyOtp,
} from "../hooks/use-verify-otp";
import { verifyOtpSchema, type VerifyOtpInput } from "../schemas";
import { sanitizeCallbackUrl } from "../utils";
import { Label } from "@/components/ui/label";

const VerifyOtpForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verifyOtpMutation = useVerifyOtp();
  const resendOtpMutation = useResendVerificationOtp();

  const email = searchParams.get("email") ?? "";
  const callbackUrl = sanitizeCallbackUrl(searchParams.get("callbackUrl"));

  const form = useForm<VerifyOtpInput>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: {
      email,
      otp: "",
    },
  });

  const onSubmit = async (values: VerifyOtpInput) => {
    const result = await verifyOtpMutation.mutateAsync(values);

    const signInResult = await signIn("credentials", {
      email: values.email,
      otpLoginToken: result.otpLoginToken,
      redirect: false,
    });

    if (signInResult?.error) {
      throw new Error("Auto login gagal");
    }

    router.push(callbackUrl);
    router.refresh();
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Verify OTP</CardTitle>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
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
                    className="mx-auto"
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

              {form.formState.errors.otp && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.otp.message}
                </p>
              )}
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
            className="w-full"
            type="submit"
            disabled={verifyOtpMutation.isPending}
          >
            {verifyOtpMutation.isPending ? "Verifying..." : "Verify Email"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export { VerifyOtpForm };
