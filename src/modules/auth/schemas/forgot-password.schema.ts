import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z.email("Invalid email"),
});

const verifyForgotPasswordOtpSchema = z.object({
  email: z.email("Invalid email"),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

const resetPasswordSchema = z.object({
  email: z.email("Invalid email"),
  resetToken: z.string().min(1, "Reset token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Confirm password is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
type VerifyForgotPasswordOtpInput = z.infer<typeof verifyForgotPasswordOtpSchema>;
type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export {
  forgotPasswordSchema,
  verifyForgotPasswordOtpSchema,
  resetPasswordSchema,
};
export type {
  ForgotPasswordInput,
  VerifyForgotPasswordOtpInput,
  ResetPasswordInput,
};
