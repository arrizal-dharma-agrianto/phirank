import { VerifyOtpInput } from "../schemas";

const verifyOtp = async (data: VerifyOtpInput) => {
  const res = await fetch("/api/auth/verify-otp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result = await res.json();

  if (!res.ok) {
    throw new Error(result.message ?? "Gagal verifikasi OTP");
  }

  return result;
}

const resendVerificationOtp = async (
  data: Pick<VerifyOtpInput, "email">,
) => {
  const res = await fetch("/api/auth/resend-verification-otp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result = await res.json();

  if (!res.ok) {
    throw new Error(result.message ?? "Failed to resend OTP");
  }

  return result;
}

export { verifyOtp, resendVerificationOtp };
