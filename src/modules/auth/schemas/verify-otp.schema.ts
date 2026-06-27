import { z } from "zod";

export const verifyOtpSchema = z.object({
  email: z.email("Email tidak valid"),
  otp: z.string().length(6, "OTP harus 6 digit"),
});

export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;