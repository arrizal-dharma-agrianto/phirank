import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { resendVerificationOtp, verifyOtp } from "../services";

const useVerifyOtp = () =>
  useMutation({
    mutationFn: verifyOtp,
    onSuccess: () => {
      toast.success("Email berhasil diverifikasi");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

const useResendVerificationOtp = () =>
  useMutation({
    mutationFn: resendVerificationOtp,
    onSuccess: () => {
      toast.success("OTP sent to your email", {
        id: "resend-otp",
      });
    },
    onError: (error) => {
      toast.error(error.message, {
        id: "resend-otp",
      });
    },
  });

export { useVerifyOtp, useResendVerificationOtp }
