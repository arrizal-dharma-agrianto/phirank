# Mail

Dokumen ini menjelaskan struktur, konfigurasi, dan langkah setup pengiriman email pada project.

## Stack

- Nodemailer untuk driver SMTP bawaan
- Resend package sudah tersedia sebagai opsi third-party provider
- Driver-based mail config melalui `MAIL_DRIVER`
- Next.js server-only module untuk transport SMTP
- Auth module untuk email OTP verifikasi dan reset password

## Struktur Folder

```txt
src/config/mail.config.ts
src/lib/mail.ts
src/lib/smtp.ts
src/modules/mail/
  services/
    mail.service.ts
  templates/
    mail-layout.template.ts
    otp-email.template.ts
    verify-email.template.ts
  types/
    mail.type.ts
```

Export module berada di:

```txt
src/config/index.ts
src/modules/mail/index.ts
src/modules/mail/services/index.ts
src/modules/mail/templates/index.ts
src/modules/mail/types/index.ts
```

## Konsep Driver

Mail module sekarang memakai konfigurasi driver dari:

```txt
src/config/mail.config.ts
```

Driver aktif dipilih dari environment variable:

```txt
MAIL_DRIVER
```

Jika `MAIL_DRIVER` tidak diisi, project memakai default:

```txt
smtp
```

`src/lib/mail.ts` membaca driver aktif dari `emailConfig`:

```ts
const configuredMailDriver =
  emailConfig[
    emailConfig.driver as Exclude<
      keyof typeof emailConfig,
      "driver" | "layout"
    >
  ];
```

Jika `MAIL_DRIVER` menunjuk ke driver yang belum didaftarkan di `emailConfig`, aplikasi akan error:

```txt
Mail driver "{driver}" not found
```

Artinya, setiap third-party provider harus ditambahkan sebagai key baru di `emailConfig`.

## Service Pengiriman Email

Service mail berada di:

```txt
src/modules/mail/services/mail.service.ts
```

Fungsi utama:

```ts
const sendMail = async (
  params: SendMailParams,
) => {
  await mailDriver.send(params);
};
```

Semua caller cukup memakai `sendMail`. Detail provider disembunyikan di driver aktif.

Type parameter berada di:

```txt
src/modules/mail/types/mail.type.ts
```

```ts
type SendMailParams = {
  to: string;
  subject: string;
  html: string;
};
```

## Driver SMTP

Driver SMTP bawaan didefinisikan di:

```txt
src/config/mail.config.ts
src/lib/smtp.ts
```

Transport SMTP dibuat dengan Nodemailer:

```ts
const smtpTransport = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});
```

Driver SMTP di `emailConfig`:

```ts
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
```

Environment variable untuk SMTP:

```txt
MAIL_DRIVER=smtp
MAIL_FROM="Product Name <no-reply@example.com>"
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
```

Gunakan `SMTP_SECURE=true` untuk SMTP TLS langsung seperti port `465`. Untuk STARTTLS seperti port `587`, gunakan `SMTP_SECURE=false`.

## Third-Party Email Provider

Project dapat memakai provider pihak ketiga selama provider tersebut didaftarkan sebagai driver di `src/config/mail.config.ts`.

Contoh provider:

- Resend
- SendGrid
- Mailgun
- Postmark
- Amazon SES

Kontrak minimal setiap driver:

```ts
{
  async send(params: SendMailParams) {
    // kirim email lewat provider
  },
}
```

Karena `sendMail` hanya memanggil `mailDriver.send(params)`, caller auth tidak perlu berubah saat driver diganti.

## Setup Third-Party Provider

Langkah umum:

1. Buat akun di provider email.
2. Verifikasi domain pengirim di dashboard provider.
3. Tambahkan DNS record yang diminta provider, biasanya SPF, DKIM, dan DMARC.
4. Tunggu status domain menjadi verified.
5. Buat API key dengan permission untuk mengirim email.
6. Simpan API key di `.env`.
7. Tambahkan driver provider di `src/config/mail.config.ts`.
8. Set `MAIL_DRIVER` sesuai nama key driver.
9. Pastikan `MAIL_FROM` memakai domain yang sudah diverifikasi.
10. Jalankan flow register atau forgot password untuk menguji pengiriman OTP.

Jangan commit API key atau credential SMTP asli ke repository.

## Contoh Setup Resend

Package `resend` sudah tersedia di dependencies project.

Environment variable:

```txt
MAIL_DRIVER=resend
MAIL_FROM="Product Name <no-reply@yourdomain.com>"
RESEND_API_KEY=your-resend-api-key
```

Tambahkan driver `resend` di `src/config/mail.config.ts`:

```ts
import { Resend } from "resend";
import { smtpTransport } from "@/lib/smtp";
import { SendMailParams } from "@/modules/mail";

const resend = new Resend(process.env.RESEND_API_KEY);

const emailConfig = {
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

  resend: {
    async send(params: SendMailParams) {
      await resend.emails.send({
        from: process.env.MAIL_FROM!,
        to: params.to,
        subject: params.subject,
        html: params.html,
      });
    },
  },
};

export { emailConfig };
```

Setelah driver ditambahkan, `sendMail` otomatis memakai Resend ketika:

```txt
MAIL_DRIVER=resend
```

## Contoh Setup Provider Lain

Untuk provider selain Resend, buat key driver baru dengan nama provider.

Contoh struktur:

```ts
const emailConfig = {
  driver: process.env.MAIL_DRIVER ?? "smtp",

  smtp: {
    async send(params: SendMailParams) {
      // existing SMTP driver
    },
  },

  sendgrid: {
    async send(params: SendMailParams) {
      // panggil SDK atau REST API SendGrid
    },
  },

  mailgun: {
    async send(params: SendMailParams) {
      // panggil SDK atau REST API Mailgun
    },
  },
};
```

Lalu pilih driver dari `.env`:

```txt
MAIL_DRIVER=sendgrid
```

Pastikan dependency SDK provider sudah terpasang jika memakai SDK resmi.

## Pemakaian oleh Auth

Mail module dipakai oleh route auth berikut:

```txt
src/app/api/auth/register/route.ts
src/app/api/auth/forgot-password/route.ts
```

### Email Verifikasi Register

Saat register berhasil, API:

1. Membuat OTP 6 digit.
2. Menyimpan hash OTP ke `VerificationToken`.
3. Mengirim email ke user dengan subject `Verify your email`.
4. OTP berlaku 10 menit.

HTML email saat ini dibuat inline di route register:

```txt
Your OTP Code
Your verification code is:
{otp}
This code expires in 10 minutes.
```

### Email Forgot Password

Saat user meminta reset password, API:

1. Mencari user berdasarkan email.
2. Jika user ditemukan, membuat OTP 6 digit.
3. Menyimpan hash OTP ke `VerificationToken`.
4. Mengirim email ke user dengan subject `Reset your password`.
5. OTP berlaku 10 menit.
6. Tetap mengembalikan response generik meskipun email tidak terdaftar.

HTML email saat ini dibuat inline di route forgot password:

```txt
Password reset OTP
Your password reset code is:
{otp}
This code expires in 10 minutes.
```

## Template

Template yang tersedia saat ini:

```txt
src/modules/mail/templates/mail-layout.template.ts
src/modules/mail/templates/otp-email.template.ts
src/modules/mail/templates/verify-email.template.ts
```

### Default Layout

Default layout email berada di:

```txt
src/modules/mail/templates/mail-layout.template.ts
```

Template ini mengekspor:

```ts
defaultMailLayoutTemplate
mailLayoutTemplate
escapeHtml
```

`defaultMailLayoutTemplate` adalah layout bawaan project.

`mailLayoutTemplate` adalah resolver layout yang dipakai oleh template email. Resolver ini akan memakai `emailConfig.layout` jika tersedia. Jika `emailConfig.layout` kosong, resolver memakai `defaultMailLayoutTemplate`.

Kontrak layout:

```ts
type MailLayoutParams = {
  title: string;
  previewText?: string;
  children: string;
};

type MailLayoutTemplate = (params: MailLayoutParams) => string;
```

### Custom Layout

User dapat mengganti layout email dari:

```txt
src/config/mail.config.ts
```

Tambahkan property `layout` pada `emailConfig`:

```ts
import { smtpTransport } from "@/lib/smtp";
import type {
  MailConfig,
  MailLayoutParams,
  SendMailParams,
} from "@/modules/mail";

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

  layout: ({ title, previewText, children }: MailLayoutParams) => `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
      </head>
      <body>
        <div style="display:none;max-height:0;overflow:hidden;">
          ${previewText ?? title}
        </div>
        <main>
          ${children}
        </main>
      </body>
    </html>
  `,
};

export { emailConfig };
```

Jika ingin custom layout tetap aman dari HTML injection, escape nilai yang berasal dari user memakai `escapeHtml`:

```ts
import { escapeHtml } from "@/modules/mail";

layout: ({ title, previewText, children }) => {
  const safeTitle = escapeHtml(title);
  const safePreviewText = previewText ? escapeHtml(previewText) : safeTitle;

  return `
    <html>
      <head>
        <title>${safeTitle}</title>
      </head>
      <body>
        <div style="display:none;max-height:0;overflow:hidden;">
          ${safePreviewText}
        </div>
        ${children}
      </body>
    </html>
  `;
},
```

Catatan:

- `children` adalah HTML body yang sudah dibuat oleh template email.
- `title` dan `previewText` sebaiknya di-escape jika masuk ke markup.
- Jika `layout` dihapus atau `undefined`, email otomatis kembali memakai `defaultMailLayoutTemplate`.

### Verify Email Template

Template `verifyEmailTemplate` menerima:

```ts
type VerifyEmailTemplateParams = {
  name: string;
  verifyUrl: string;
};
```

Template ini menghasilkan email berisi link verifikasi. Flow auth terbaru memakai OTP dan masih membuat HTML email secara inline di route handler, sehingga template ini belum dipakai oleh route register.

### OTP Email Template

Template OTP berada di:

```txt
src/modules/mail/templates/otp-email.template.ts
```

Template ini menerima:

```ts
type OtpEmailTemplateParams = {
  title: string;
  description: string;
  otp: string;
  expiresIn?: string;
};
```

Template ini memakai `mailLayoutTemplate`, sehingga otomatis mengikuti custom layout dari `emailConfig.layout`.

## Environment Variable

Environment variable umum:

```txt
MAIL_DRIVER
MAIL_FROM
```

Environment variable SMTP:

```txt
SMTP_HOST
SMTP_PORT
SMTP_SECURE
SMTP_USER
SMTP_PASSWORD
```

Environment variable provider pihak ketiga bergantung pada driver yang dipakai, misalnya:

```txt
RESEND_API_KEY
SENDGRID_API_KEY
MAILGUN_API_KEY
POSTMARK_SERVER_TOKEN
```

Contoh format `MAIL_FROM`:

```txt
Product Name <no-reply@example.com>
```

Untuk production, `MAIL_FROM` harus memakai domain yang sudah diverifikasi di provider email.

## Error Handling

`sendMail` tidak menangkap error dari driver. Jika SMTP atau provider pihak ketiga gagal, error akan naik ke caller.

Dampak saat ini:

- Register dapat gagal jika email OTP verifikasi gagal dikirim.
- Request forgot password dapat gagal jika email OTP reset password gagal dikirim untuk user yang ditemukan.
- Aplikasi akan gagal start atau gagal import mail layer jika `MAIL_DRIVER` tidak cocok dengan key driver di `emailConfig`.

Jika perlu behavior yang lebih tahan gagal, caller harus menangani error `sendMail` dan menentukan apakah user creation atau token creation perlu di-rollback.

## Catatan Keamanan

- OTP mentah hanya dikirim lewat email.
- Database menyimpan hash OTP memakai helper `hashOtp`.
- Response forgot password sengaja generik untuk mengurangi risiko email enumeration.
- API key provider harus disimpan sebagai secret.
- Batasi permission API key hanya untuk pengiriman email jika provider mendukung.
- Gunakan domain terverifikasi dengan SPF, DKIM, dan DMARC untuk production.
