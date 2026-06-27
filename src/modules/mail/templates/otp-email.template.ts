import { escapeHtml, mailLayoutTemplate } from "./mail-layout.template";

type OtpEmailTemplateParams = {
  title: string;
  description: string;
  otp: string;
  expiresIn?: string;
};

const otpEmailTemplate = ({
  title,
  description,
  otp,
  expiresIn = "10 minutes",
}: OtpEmailTemplateParams) => {
  const safeDescription = escapeHtml(description);
  const safeOtp = escapeHtml(otp);
  const safeExpiresIn = escapeHtml(expiresIn);

  return mailLayoutTemplate({
    title,
    previewText: `${title}: ${otp}`,
    children: `
      <p style="margin:0 0 16px;font-size:14px;line-height:22px;color:#334155;">
        ${safeDescription}
      </p>
      <div style="margin:20px 0;padding:18px 20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;text-align:center;">
        <div style="margin:0 0 8px;font-size:12px;line-height:18px;color:#64748b;">
          Your one-time code
        </div>
        <div style="font-size:32px;line-height:40px;font-weight:700;letter-spacing:6px;color:#020617;font-family:'SFMono-Regular',Consolas,'Liberation Mono',monospace;">
          ${safeOtp}
        </div>
      </div>
      <p style="margin:0;font-size:13px;line-height:20px;color:#64748b;">
        This code expires in ${safeExpiresIn}.
      </p>
    `,
  });
};

export { otpEmailTemplate };
export type { OtpEmailTemplateParams };
