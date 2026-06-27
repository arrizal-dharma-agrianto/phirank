import { smtpTransport } from "@/lib/smtp";
import { MailConfig, SendMailParams } from "@/modules/mail";

const emailConfig: MailConfig = {
  driver: process.env.MAIL_DRIVER ?? "smtp",
  smtp: {
    async send(params: SendMailParams) {
      await smtpTransport.sendMail({
        from: process.env.MAIL_FROM,
        to: params.to,
        subject: params.subject,
        html: params.html,
      });
    },
  },
  // layout: ({ title, children }: MailLayoutParams) => ` //import MailLayoutParams from modules/mail if you want to use custom layout
  //   <html>
  //     <body>
  //       <h1>${title}</h1>
  //       ${children}
  //     </body>
  //   </html>
  // `,
};

export { emailConfig };
