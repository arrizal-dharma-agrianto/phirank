import { VerifyEmailTemplateParams } from "../types";
import { escapeHtml, mailLayoutTemplate } from "./mail-layout.template";

const verifyEmailTemplate = (
  params: VerifyEmailTemplateParams,
) => {
  const safeName = escapeHtml(params.name);
  const safeVerifyUrl = escapeHtml(params.verifyUrl);

  return mailLayoutTemplate({
    title: "Verify your email",
    previewText: "Please verify your email address.",
    children: `
      <p style="margin:0 0 16px;font-size:14px;line-height:22px;color:#334155;">
        Hello ${safeName}, please verify your email address to finish setting up your account.
      </p>
      <a href="${safeVerifyUrl}" style="display:inline-block;background:#020617;color:#ffffff;text-decoration:none;border-radius:6px;padding:10px 14px;font-size:13px;font-weight:600;">
        Verify Email
      </a>
    `,
  });
}

export { verifyEmailTemplate };