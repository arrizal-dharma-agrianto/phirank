import type {
  ForgotPasswordInput,
  ResetPasswordInput,
  VerifyForgotPasswordOtpInput,
} from "../schemas";

const requestPasswordReset = async (data: ForgotPasswordInput) => {
  const res = await fetch("/api/auth/forgot-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result = await res.json();

  if (!res.ok) {
    throw new Error(result.message ?? "Failed to request password reset");
  }

  return result;
};

const verifyForgotPasswordOtp = async (
  data: VerifyForgotPasswordOtpInput,
) => {
  const res = await fetch("/api/auth/forgot-password/verify-otp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result = await res.json();

  if (!res.ok) {
    throw new Error(result.message ?? "Failed to verify OTP");
  }

  return result as {
    email: string;
    resetToken: string;
  };
};

const resetPassword = async (data: ResetPasswordInput) => {
  const res = await fetch("/api/auth/forgot-password/reset", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result = await res.json();

  if (!res.ok) {
    throw new Error(result.message ?? "Failed to reset password");
  }

  return result;
};

export {
  requestPasswordReset,
  resetPassword,
  verifyForgotPasswordOtp,
};
