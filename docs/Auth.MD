# Auth

Dokumen ini menjelaskan struktur dan alur autentikasi pada project.

## Stack

- Next.js App Router
- NextAuth
- Prisma
- Nodemailer untuk pengiriman OTP email
- React Hook Form
- Zod
- Sonner toast
- TanStack Query untuk mutation register, login, verifikasi OTP, dan forgot password
- Shadcn UI untuk card, input, button, dan input OTP

## Struktur Folder

```txt
src/modules/auth/
  components/
    forgot-password-form.tsx
    forgot-password-otp-form.tsx
    login-form.tsx
    logout-button.tsx
    register-form.tsx
    reset-password-form.tsx
    verify-otp-form.tsx
  hooks/
    use-forgot-password.ts
    use-login.ts
    use-logout.ts
    use-register.ts
    use-verify-otp.ts
  schemas/
    forgot-password.schema.ts
    login.schema.ts
    register.schema.ts
    verify-otp.schema.ts
  services/
    auth.service.ts
    forgot-password.service.ts
    verify-otp.service.ts
  utils/
    otp.ts
```

Route auth berada di:

```txt
src/app/(auth)/
src/app/api/auth/
src/proxy.ts
```

Route halaman auth saat ini:

```txt
/login
/register
/verify-otp
/forgot-password
/forgot-password/verify-otp
/forgot-password/reset
```

## Register dan Verifikasi Email

Komponen register berada di:

```txt
src/modules/auth/components/register-form.tsx
```

API register berada di:

```txt
src/app/api/auth/register/route.ts
```

Alur register:

1. User mengisi nama, email, password, dan confirm password.
2. Input divalidasi dengan `registerSchema`.
3. Form memanggil `useRegister`.
4. `useRegister` memanggil `registerUser`.
5. `registerUser` mengirim request ke `/api/auth/register`.
6. API melakukan validasi ulang dengan `registerSchema`.
7. API menolak request jika email sudah terdaftar.
8. API membuat user baru dengan `passwordHash`.
9. API membuat OTP 6 digit memakai `generateOtp`.
10. API menghapus token lama dengan `identifier` email user.
11. API menyimpan hash OTP ke `VerificationToken` dengan masa berlaku 10 menit.
12. API mengirim email OTP dengan subject `Verify your email`.
13. Jika berhasil, tampil toast sukses.
14. User diarahkan ke `/verify-otp?email={email}`.

User hasil register belum otomatis login sampai email diverifikasi.

## Verifikasi OTP Email

Komponen verifikasi email berada di:

```txt
src/modules/auth/components/verify-otp-form.tsx
```

API verifikasi email berada di:

```txt
src/app/api/auth/verify-otp/route.ts
```

Alur verifikasi OTP email:

1. Halaman `/verify-otp` membaca query `email`.
2. User memasukkan OTP 6 digit.
3. Input divalidasi dengan `verifyOtpSchema`.
4. Form memanggil `useVerifyOtp`.
5. `useVerifyOtp` memanggil service `verifyOtp`.
6. Service mengirim request ke `/api/auth/verify-otp`.
7. API mencari `VerificationToken` dengan pasangan `identifier=email` dan `token=hashOtp(email, otp)`.
8. Jika token tidak ditemukan, API mengembalikan error `OTP salah`.
9. Jika token expired, API menghapus token tersebut dan mengembalikan error `OTP sudah expired`.
10. Jika valid, API mengisi field `emailVerified` pada user.
11. API menghapus OTP verifikasi email yang sudah dipakai.
12. API membuat `otpLoginToken` sementara dengan `identifier=otp-login:{email}` dan masa berlaku 5 menit.
13. Client menjalankan `signIn("credentials", { email, otpLoginToken, redirect: false })`.
14. NextAuth memvalidasi `otpLoginToken`, menghapusnya setelah dipakai, lalu membuat session.
15. User diarahkan ke `/dashboard`.

## Login

Komponen login berada di:

```txt
src/modules/auth/components/login-form.tsx
```

Alur login email dan password:

1. User mengisi email dan password.
2. Input divalidasi dengan `loginSchema`.
3. Form memanggil `useLogin`.
4. `useLogin` memanggil `loginWithCredentials`.
5. `loginWithCredentials` menjalankan `signIn("credentials", { redirect: false })`.
6. NextAuth mengambil user berdasarkan email.
7. NextAuth memastikan user memiliki `passwordHash`.
8. NextAuth memverifikasi password dengan `verifyPassword`.
9. NextAuth menolak login credentials jika `emailVerified` masih kosong.
10. Jika credentials valid dan email sudah terverifikasi, user diarahkan ke `/dashboard` dan route di-refresh.
11. Jika gagal, form menampilkan fallback error dan toast gagal.

Service login berada di:

```txt
src/modules/auth/services/auth.service.ts
```

Catatan: service saat ini menampilkan error fallback `Invalid email or password.` untuk error NextAuth, termasuk email yang belum diverifikasi.

## Login Google

Register dan login form sama-sama menyediakan tombol Google:

```ts
signIn("google", {
  callbackUrl: "/dashboard",
});
```

Pada callback JWT, login Google akan mengisi `emailVerified` jika user Google memiliki email yang sama dan field tersebut masih kosong.

Pastikan environment variable Google OAuth sudah tersedia sebelum digunakan:

```txt
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
```

## Logout

Komponen logout berada di:

```txt
src/modules/auth/components/logout-button.tsx
```

Alur logout:

1. User menekan tombol logout.
2. Komponen memanggil `useLogout`.
3. `useLogout` memanggil service `logout`.
4. Service menjalankan `signOut({ redirect: false, callbackUrl: "/login" })`.
5. Jika logout berhasil, tampil toast sukses.
6. User diarahkan ke `/login` dan route di-refresh.
7. Jika logout gagal, tampil toast gagal.

## Forgot Password

Forgot password memakai tiga halaman:

```txt
src/app/(auth)/forgot-password/page.tsx
src/app/(auth)/forgot-password/verify-otp/page.tsx
src/app/(auth)/forgot-password/reset/page.tsx
```

Komponen forgot password berada di:

```txt
src/modules/auth/components/forgot-password-form.tsx
src/modules/auth/components/forgot-password-otp-form.tsx
src/modules/auth/components/reset-password-form.tsx
```

API forgot password berada di:

```txt
src/app/api/auth/forgot-password/route.ts
src/app/api/auth/forgot-password/verify-otp/route.ts
src/app/api/auth/forgot-password/reset/route.ts
```

### Request Reset Password

Alur request reset password:

1. User membuka `/forgot-password`.
2. User mengisi email.
3. Input divalidasi dengan `forgotPasswordSchema`.
4. Form memanggil `useForgotPassword`.
5. Service mengirim request ke `/api/auth/forgot-password`.
6. API melakukan validasi ulang dengan `forgotPasswordSchema`.
7. API mencari user berdasarkan email.
8. Jika user ditemukan dan memiliki email, API membuat OTP 6 digit.
9. API menghapus token lama dengan `identifier=forgot-password:{email}`.
10. API menyimpan hash OTP ke `VerificationToken` dengan masa berlaku 10 menit.
11. API mengirim email OTP dengan subject `Reset your password`.
12. API selalu mengembalikan pesan generik `If the email exists, an OTP has been sent.` agar tidak membocorkan apakah email terdaftar.
13. Client menampilkan toast sukses dan mengarahkan user ke `/forgot-password/verify-otp?email={email}`.

### Verifikasi OTP Forgot Password

Alur verifikasi OTP reset password:

1. Halaman `/forgot-password/verify-otp` membaca query `email`.
2. User memasukkan OTP 6 digit.
3. Input divalidasi dengan `verifyForgotPasswordOtpSchema`.
4. Service mengirim request ke `/api/auth/forgot-password/verify-otp`.
5. API mencari token dengan `identifier=forgot-password:{email}` dan `token=hashOtp(email, otp)`.
6. Jika token tidak ditemukan, API mengembalikan error `OTP is invalid`.
7. Jika token expired, API menghapus token tersebut dan mengembalikan error `OTP has expired`.
8. Jika valid, API membuat `resetToken` acak 32 byte.
9. API menghapus reset token lama dengan `identifier=reset-password:{email}`.
10. API menyimpan hash reset token ke `VerificationToken` dengan masa berlaku 10 menit.
11. API menghapus OTP forgot password yang sudah dipakai.
12. Client diarahkan ke `/forgot-password/reset?email={email}&token={resetToken}`.

### Reset Password

Alur reset password:

1. Halaman `/forgot-password/reset` membaca query `email` dan `token`.
2. User mengisi password baru dan confirm password.
3. Input divalidasi dengan `resetPasswordSchema`.
4. Service mengirim request ke `/api/auth/forgot-password/reset`.
5. API mencari token dengan `identifier=reset-password:{email}` dan `token=hashOtp(email, resetToken)`.
6. Jika token tidak ditemukan, API mengembalikan error `Reset token is invalid`.
7. Jika token expired, API menghapus token tersebut dan mengembalikan error `Reset token has expired`.
8. Jika valid, API menyimpan password baru dengan `hashPassword`.
9. API mengisi `emailVerified` dengan tanggal saat ini.
10. API menghapus reset token yang sudah dipakai.
11. Client menampilkan toast sukses dan mengarahkan user ke `/login`.

## OTP dan Token

Helper OTP berada di:

```txt
src/modules/auth/utils/otp.ts
```

Aturan OTP dan token:

- `generateOtp` menghasilkan string angka 6 digit.
- `hashOtp(email, otp)` memakai SHA-256 dengan format input `{email}:{otp}`.
- OTP mentah hanya dikirim lewat email atau dikembalikan sebagai token sementara khusus login/reset.
- Database menyimpan hash token, bukan OTP mentah.
- `VerificationToken` memakai unique pair `identifier` dan `token`.
- Token sekali pakai dihapus setelah berhasil digunakan.
- Token expired dihapus ketika ditemukan saat proses verifikasi.

Identifier yang dipakai:

```txt
{email}
forgot-password:{email}
reset-password:{email}
otp-login:{email}
```

Masa berlaku token:

```txt
Email verification OTP: 10 menit
Forgot password OTP: 10 menit
Reset password token: 10 menit
OTP login token: 5 menit
```

## Validasi Input

Schema validasi berada di:

```txt
src/modules/auth/schemas/login.schema.ts
src/modules/auth/schemas/register.schema.ts
src/modules/auth/schemas/verify-otp.schema.ts
src/modules/auth/schemas/forgot-password.schema.ts
```

Aturan validasi utama:

- Register: `name` minimal 2 karakter, email valid, password minimal 8 karakter, confirm password wajib sama.
- Login: email valid dan password wajib diisi.
- Verifikasi OTP email: email valid dan OTP tepat 6 digit.
- Forgot password: email valid.
- Verifikasi OTP forgot password: email valid dan OTP tepat 6 digit.
- Reset password: email valid, reset token wajib ada, password minimal 8 karakter, confirm password wajib sama.

Form menggunakan `noValidate` pada sebagian besar flow, sehingga validasi browser tidak mengambil alih pesan error dari React Hook Form dan Zod.

## Toast

Toast menggunakan `sonner`.

Toaster global dipasang di:

```txt
src/app/layout.tsx
```

Toast auth saat ini:

- Register berhasil: `Account created successfully. Please verify your email.`
- Verifikasi email berhasil: `Email berhasil diverifikasi`
- Login berhasil: `Login successful`
- Forgot password OTP terkirim: `OTP sent to your email`
- OTP forgot password valid: `OTP verified`
- Reset password berhasil: `Password reset successfully`
- Logout berhasil: toast sukses dari `logout-button.tsx`

## Protected Route

Proteksi route berada di:

```txt
src/proxy.ts
```

Project ini memakai `proxy.ts` karena pada Next.js 16 file convention `middleware.ts` sudah diganti menjadi Proxy.

Route yang diproteksi saat ini:

```txt
/dashboard
```

Alur proteksi:

1. Proxy berjalan untuk matcher `/dashboard/:path*`.
2. Proxy membaca token session dengan `getToken` dari `next-auth/jwt`.
3. Jika token tidak ada, user diarahkan ke `/login`.
4. URL tujuan asal disimpan pada query `callbackUrl`.
5. Jika token ada, request dilanjutkan dengan `NextResponse.next()`.

Konfigurasi matcher:

```ts
export const config = {
  matcher: ["/dashboard/:path*"],
};
```

Pastikan secret yang digunakan oleh NextAuth dan Proxy sama. Saat ini Proxy membaca:

```txt
NEXTAUTH_SECRET
```

## Catatan Database

Schema Prisma memiliki model yang dibutuhkan untuk NextAuth dan token OTP:

```txt
User
Account
Session
VerificationToken
```

Field penting pada `User`:

```txt
email
emailVerified
passwordHash
```

Model `VerificationToken`:

```prisma
model VerificationToken {
  identifier String
  token      String
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_tokens")
}
```

Untuk credentials login, password disimpan dalam field `passwordHash` pada model `User`.
