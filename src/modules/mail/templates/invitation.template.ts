import { mailLayoutTemplate, escapeHtml } from "./mail-layout.template";

type InvitationTemplateParams = {
  inviterName: string;
  tenantName: string;
  roleName: string;
  inviteUrl: string;
  expiresInDays: number;
};

const invitationTemplate = (params: InvitationTemplateParams) => {
  const safeInviterName = escapeHtml(params.inviterName);
  const safeTenantName = escapeHtml(params.tenantName);
  const safeRoleName = escapeHtml(params.roleName);
  const safeInviteUrl = escapeHtml(params.inviteUrl);

  return mailLayoutTemplate({
    title: `You're invited to join ${safeTenantName}`,
    previewText: `${safeInviterName} invited you to join ${safeTenantName} as ${safeRoleName}.`,
    children: `
      <p style="margin:0 0 16px;font-size:14px;line-height:22px;color:#334155;">
        <strong>${safeInviterName}</strong> has invited you to join
        <strong>${safeTenantName}</strong> as <strong>${safeRoleName}</strong>.
      </p>
      <p style="margin:0 0 24px;font-size:14px;line-height:22px;color:#334155;">
        Click the button below to accept the invitation. This link will expire in
        <strong>${params.expiresInDays} days</strong>.
      </p>
      <a href="${safeInviteUrl}"
        style="display:inline-block;background:#020617;color:#ffffff;text-decoration:none;border-radius:6px;padding:10px 14px;font-size:13px;font-weight:600;">
        Accept Invitation
      </a>
      <p style="margin:24px 0 0;font-size:12px;line-height:18px;color:#94a3b8;">
        If you didn't expect this invitation, you can safely ignore this email.
      </p>
    `,
  });
};

export { invitationTemplate };
export type { InvitationTemplateParams };
