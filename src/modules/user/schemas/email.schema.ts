import { z } from "zod";

const verifyCurrentEmailOtpSchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits"),
});

const sendNewEmailLinkSchema = z.object({
  newEmail: z.email("Invalid email"),
  currentEmailToken: z.string().min(1, "Current email verification is required"),
});

const sendNewEmailOtpSchema = sendNewEmailLinkSchema;

type VerifyCurrentEmailOtpInput = z.infer<
  typeof verifyCurrentEmailOtpSchema
>;
type SendNewEmailLinkInput = z.infer<typeof sendNewEmailLinkSchema>;
type SendNewEmailOtpInput = SendNewEmailLinkInput;

export {
  verifyCurrentEmailOtpSchema,
  sendNewEmailLinkSchema,
  sendNewEmailOtpSchema,
};
export type {
  VerifyCurrentEmailOtpInput,
  SendNewEmailLinkInput,
  SendNewEmailOtpInput,
};
