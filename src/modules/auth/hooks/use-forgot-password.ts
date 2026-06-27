import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  requestPasswordReset,
  resetPassword,
  verifyForgotPasswordOtp,
} from "../services";

const useForgotPassword = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: requestPasswordReset,
    onSuccess: (_, variables) => {
      toast.success("OTP sent to your email");
      router.push(
        `/forgot-password/verify-otp?email=${encodeURIComponent(variables.email)}`,
      );
    },
    onError: (error) => {
      toast.error("Failed to request password reset", {
        description: error instanceof Error ? error.message : undefined,
      });
    },
  });
};

const useVerifyForgotPasswordOtp = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: verifyForgotPasswordOtp,
    onSuccess: (result) => {
      toast.success("OTP verified");
      router.push(
        `/forgot-password/reset?email=${encodeURIComponent(result.email)}&token=${encodeURIComponent(result.resetToken)}`,
      );
    },
    onError: (error) => {
      toast.error("Failed to verify OTP", {
        description: error instanceof Error ? error.message : undefined,
      });
    },
  });
};

const useResendForgotPasswordOtp = () => {
  return useMutation({
    mutationFn: requestPasswordReset,
    onSuccess: () => {
      toast.success("OTP sent to your email", {
        id: "resend-otp",
      });
    },
    onError: (error) => {
      toast.error("Failed to resend OTP", {
        id: "resend-otp",
        description: error instanceof Error ? error.message : undefined,
      });
    },
  });
};

const useResetPassword = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: resetPassword,
    onSuccess: () => {
      toast.success("Password reset successfully");
      router.push("/login");
    },
    onError: (error) => {
      toast.error("Failed to reset password", {
        description: error instanceof Error ? error.message : undefined,
      });
    },
  });
};

export {
  useForgotPassword,
  useResendForgotPasswordOtp,
  useResetPassword,
  useVerifyForgotPasswordOtp,
};
