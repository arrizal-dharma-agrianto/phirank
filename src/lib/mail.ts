import { emailConfig } from "@/config";
import type { MailDriver } from "@/modules/mail/types";

const configuredDriver = emailConfig[emailConfig.driver];

const isMailDriver = (value: unknown): value is MailDriver =>
  typeof value === "object" &&
  value !== null &&
  "send" in value &&
  typeof value.send === "function";

if (!isMailDriver(configuredDriver)) {
  throw new Error(
    `Mail driver "${emailConfig.driver}" not found`,
  );
}

const mailDriver = configuredDriver;

export { mailDriver };
