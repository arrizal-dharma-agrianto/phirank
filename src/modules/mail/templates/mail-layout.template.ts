import { emailConfig } from "@/config";
import type { MailLayoutParams, MailLayoutTemplate } from "../types";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const defaultMailLayoutTemplate: MailLayoutTemplate = ({
  title,
  previewText,
  children,
}) => {
  const safeTitle = escapeHtml(title);
  const safePreviewText = previewText ? escapeHtml(previewText) : safeTitle;

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>${safeTitle}</title>
  </head>
  <body style="margin:0;background:#f8fafc;color:#020617;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${safePreviewText}
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;margin:0;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="padding:20px 24px;border-bottom:1px solid #e2e8f0;">
                <div style="font-size:12px;font-weight:600;letter-spacing:0;color:#64748b;text-transform:uppercase;">
                  Account Security
                </div>
                <h1 style="margin:8px 0 0;font-size:20px;line-height:28px;font-weight:600;letter-spacing:0;color:#020617;">
                  ${safeTitle}
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                ${children}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px;border-top:1px solid #e2e8f0;background:#f8fafc;">
                <p style="margin:0;font-size:12px;line-height:18px;color:#64748b;">
                  If you did not request this email, you can safely ignore it.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `;
};

const mailLayoutTemplate: MailLayoutTemplate = (params) => {
  return (emailConfig.layout ?? defaultMailLayoutTemplate)(params);
};

export { defaultMailLayoutTemplate, escapeHtml, mailLayoutTemplate };
export type { MailLayoutParams, MailLayoutTemplate };
