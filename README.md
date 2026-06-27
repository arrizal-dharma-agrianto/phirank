# Phirank v1.0

Phirank adalah platform SEO workspace berbasis Next.js untuk membantu tim melakukan audit website, crawling halaman, membaca isu teknis, menyusun draft konten SEO, dan mengelola akses anggota dalam satu tenant.

Project ini bukan starter kosong. Di dalamnya sudah ada autentikasi, tenant/workspace, RBAC, audit Lighthouse, crawler, integrasi AI content generator, upload avatar via S3-compatible storage, dan email OTP.

## Fitur Utama

- **Website audit**: analisis URL publik dengan skor Performance, SEO, Accessibility, Best Practices, dan Security.
- **Data audit crawler**: crawling website, inspeksi halaman, status indexability, keyword/content audit, dan backlink profile.
- **Content generator**: membuat draft artikel/landing page/FAQ/product description dengan Groq, menyimpan draft, publish via webhook, dan submit IndexNow.
- **Multi-tenant workspace**: user bisa memiliki beberapa tenant dan berpindah workspace aktif.
- **RBAC**: role, permission matrix, member management, dan invitation flow per tenant.
- **Authentication**: register, login credentials, Google OAuth, verifikasi email OTP, forgot password, dan session dengan NextAuth.
- **User account**: update profile, avatar, email, password, dan delete account.
- **Object storage**: upload langsung dari browser memakai presigned URL ke S3-compatible storage seperti MinIO.
- **Mailing**: template email untuk OTP, verifikasi email, dan invitation.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Prisma 7 + PostgreSQL
- NextAuth
- TanStack Query
- Tailwind CSS 4 + shadcn/radix-ui
- Lighthouse, Cheerio, Crawlee, DataForSEO
- Groq API
- Nodemailer
- AWS SDK S3 / MinIO
- Bun

## Struktur Project

```txt
src/app/                         Route pages dan API handlers
src/modules/auth/                Login, register, OTP, forgot password
src/modules/tenant/              Workspace, active tenant, tenant settings
src/modules/rbac/                Role, permission, member, invitation
src/modules/web-audit/           Audit URL tunggal dengan Lighthouse
src/modules/data-audit-crawler/  Website crawler dan audit halaman
src/modules/content-generator/   AI draft, webhook integration, IndexNow
src/modules/user/                Profile, email, password, account settings
src/modules/upload/              Presigned upload dan image compression
src/modules/mail/                Mail service dan templates
src/lib/                         Shared server/client utilities
prisma/                          Schema, migrations, seed
docs/                            Dokumentasi fitur per modul
```

## Prasyarat

- Bun
- PostgreSQL
- MinIO atau S3-compatible object storage
- Akun Google OAuth, jika ingin memakai login Google
- SMTP credentials untuk OTP/invitation email
- Groq API key untuk content generator
- DataForSEO credentials jika crawler memakai provider `dataforseo`

## Setup Lokal

1. Install dependency.

```bash
bun install
```

2. Siapkan environment.

```bash
cp env.example .env
```

Isi minimal:

```env
DATABASE_URL=
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=

S3_ENDPOINT=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=
S3_REGION=
S3_FORCE_PATH_STYLE=true
NEXT_PUBLIC_S3_PUBLIC_URL=

MAIL_DRIVER=smtp
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
MAIL_FROM="Phirank <noreply@example.com>"

GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile
DATA_AUDIT_CRAWLER_PROVIDER=crawlee
```

3. Jalankan MinIO lokal jika dibutuhkan.

```bash
docker compose up -d
```

MinIO console tersedia di `http://localhost:9001`.

4. Jalankan migrasi database.

```bash
bun --bun run prisma migrate dev
```

5. Seed data demo.

```bash
bun run seed
```

Seed membuat tenant demo dan user berikut:

```txt
admin@acme.com   / password123
manager@acme.com / password123
member@acme.com  / password123
```

6. Jalankan development server.

```bash
bun run dev
```

Buka `http://localhost:3000`.

## Script

```bash
bun run dev      # menjalankan Next.js development server
bun run build    # production build
bun run start    # menjalankan production server
bun run lint     # menjalankan ESLint
bun run seed     # seed database demo
```

## Environment Penting

| Area | Variable |
| --- | --- |
| Database | `DATABASE_URL`, `DATABASE_LOG` |
| Auth | `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Storage | `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`, `S3_REGION`, `S3_FORCE_PATH_STYLE`, `NEXT_PUBLIC_S3_PUBLIC_URL` |
| Mail | `MAIL_DRIVER`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` |
| AI Content | `GROQ_API_KEY`, `GROQ_MODEL` |
| Crawler | `DATA_AUDIT_CRAWLER_PROVIDER`, `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`, `CRAWLEE_MAX_CONCURRENCY`, `CRAWLEE_REQUEST_TIMEOUT_SECS`, `BACKLINK_PROFILE` |
| Devtools | `NEXT_PUBLIC_TANSTACK_QUERY_DEVTOOLS` |

## Alur Produk

1. User register dan verifikasi email lewat OTP.
2. User masuk ke dashboard tenant aktif.
3. Tenant bisa mengundang member dan mengatur role/permission.
4. User menjalankan audit URL tunggal atau membuat konfigurasi crawler website.
5. Hasil audit disimpan per tenant dan bisa dibuka ulang dari history.
6. Tim membuat draft konten SEO, menyimpan draft, lalu publish ke integration webhook.
7. Jika IndexNow aktif, URL hasil publish bisa dikirim untuk indexing.

## Dokumentasi Modul

Dokumentasi detail tersedia di folder `docs/`:

- `docs/Auth.MD`
- `docs/Tenant.MD`
- `docs/User.Md`
- `docs/Upload.MD`
- `docs/Mail.MD`
- `docs/audit.md`

## Catatan Pengembangan

- Project memakai Next.js 16. Sebelum mengubah API/convention Next.js, baca guide lokal di `node_modules/next/dist/docs/`.
- Data tenant aktif disimpan di client dan dikirim ke server melalui header/cookie helper tenant.
- Endpoint audit dan crawler menolak target internal/private untuk mengurangi risiko SSRF.
- Upload memakai presigned URL, sehingga file dikirim langsung dari browser ke object storage.
- Beberapa konfigurasi lokal masih memakai nama bucket/container `boilerplate`; sesuaikan jika ingin branding storage ikut berubah.
