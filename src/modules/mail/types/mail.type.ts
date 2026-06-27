type VerifyEmailTemplateParams = {
  name: string;
  verifyUrl: string;
};

type SendMailParams = {
  to: string;
  subject: string;
  html: string;
};

type MailLayoutParams = {
  title: string;
  previewText?: string;
  children: string;
};

type MailDriver = {
  send(params: SendMailParams): Promise<void>;
};

type MailConfig = {
  driver: string;
  smtp: MailDriver;
  layout?: MailLayoutTemplate;
} & {
  [provider: string]: MailDriver | MailLayoutTemplate | string | undefined;
};

type MailLayoutTemplate = (params: MailLayoutParams) => string;

export type {
  MailLayoutParams,
  MailLayoutTemplate,
  VerifyEmailTemplateParams,
  SendMailParams,
  MailDriver,
  MailConfig,
};
