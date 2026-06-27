# User

Dokumen ini menjelaskan struktur dan alur fitur user account pada project.

## Stack

- Next.js App Router
- NextAuth session
- Prisma
- Bcrypt helper untuk hash dan verifikasi password
- React Hook Form
- Zod
- Sonner toast
- TanStack Query untuk query dan mutation profile/password
- Shadcn UI untuk card, tabs, avatar, dialog, input, tooltip, dan button
- Upload module untuk avatar image

## Struktur Folder

```txt
src/modules/user/
  components/
    account.tsx
    delete-account-button.tsx
    profile-card.tsx
    profile-card-skeleton.tsx
    settings-card.tsx
    update-password-form.tsx
  hooks/
    use-delete-account.ts
    use-profile.ts
    use-update-password.ts
    use-update-profile.ts
  schemas/
    password.schema.ts
    profile.schema.ts
  services/
    password.service.ts
    profile.service.ts
  types/
    profile.type.ts
```

Route user berada di:

```txt
src/app/(tenant)/account/page.tsx
src/app/api/user/password/route.ts
src/app/api/user/profile/route.ts
```

## Account Page

Halaman account berada di:

```txt
src/app/(tenant)/account/page.tsx
```

Halaman ini merender komponen utama:

```txt
src/modules/user/components/account.tsx
```

Komponen `Account` menggunakan tabs:

- `Profile` untuk melihat dan update data profile.
- `Update Password` untuk mengganti password account credentials.
- `Settings` untuk pengaturan account dan danger zone.

## Profile

Komponen profile berada di:

```txt
src/modules/user/components/profile-card.tsx
```

Alur load profile:

1. Komponen `ProfileCard` memanggil `useProfile`.
2. `useProfile` menjalankan query dengan `queryKey` `["profile"]`.
3. Query memanggil service `getProfile`.
4. `getProfile` mengirim request `GET` ke `/api/user/profile`.
5. API membaca user aktif melalui helper `withAuth`.
6. API mengambil data user dari Prisma.
7. Data profile ditampilkan pada card.

Field profile yang dikembalikan API:

```ts
type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  createdAt: string;
  updatedAt: string;
};
```

Saat loading, komponen menampilkan skeleton card dari:

```txt
src/modules/user/components/profile-card-skeleton.tsx
```

Saat request gagal, komponen menampilkan pesan error dari query.

## Update Profile

Update profile memakai form pada:

```txt
src/modules/user/components/profile-card.tsx
```

Alur update profile:

1. Data profile dari API dipakai untuk reset default value form.
2. User mengubah field `name` atau avatar `image`.
3. Input divalidasi dengan `updateProfileSchema`.
4. Form memanggil `useUpdateProfile`.
5. `useUpdateProfile` memanggil service `updateProfile`.
6. `updateProfile` mengirim request `PUT` ke `/api/user/profile`.
7. API melakukan validasi ulang dengan `updateProfileSchema`.
8. API menjalankan `prisma.user.update`.
9. Jika `image` adalah key temporary dari upload avatar, API memindahkan object ke folder final avatar.
10. Jika image lama adalah avatar object internal dan berbeda dari image baru, API menghapus object lama.
11. Jika berhasil, tampil toast sukses dan query `["profile"]` di-invalidate.
12. Jika gagal, tampil toast gagal.

Schema validasi berada di:

```txt
src/modules/user/schemas/profile.schema.ts
```

Aturan validasi saat ini:

```ts
const updateProfileSchema = z.object({
  name: z.string().min(2, "At least 2 characters"),
  image: z.string().optional().nullable(),
});
```

Tombol `Save changes` akan disabled ketika mutation sedang pending atau form belum berubah.

## Avatar Upload

Avatar upload berada di:

```txt
src/modules/user/components/profile-card.tsx
src/modules/upload/
src/app/api/upload/presigned-url/route.ts
```

Alur upload avatar:

1. User menekan tombol edit image.
2. Komponen membuka hidden file input dengan `accept="image/*"`.
3. File dikompresi dengan `compressImage`.
4. Komponen menampilkan preview lokal dengan `URL.createObjectURL`.
5. Komponen memanggil `useUploadFile` dengan folder `temp/avatar`.
6. Upload module meminta presigned URL ke `/api/upload/presigned-url`.
7. Browser melakukan `PUT` langsung ke object storage memakai signed URL.
8. Service upload mengembalikan object `key`.
9. Form mengisi field `image` dengan key temporary tersebut.
10. Saat profile disimpan, `/api/user/profile` memindahkan key `temp/avatar/...` menjadi `avatar/{userId}/{fileName}`.

Tombol avatar:

- Edit image membuka file picker.
- Delete image mengosongkan field `image`.
- Undo image hanya muncul ketika field image berubah dan belum disimpan.

Saat image sedang dikompresi atau di-upload, avatar menampilkan `CircleNotchIcon` dan tombol image/save disabled.

Public URL image dibentuk oleh:

```txt
src/lib/storage-url.ts
```

Key object internal akan digabung dengan environment variable:

```txt
NEXT_PUBLIC_S3_PUBLIC_URL
```

## Update Password

Komponen update password berada di:

```txt
src/modules/user/components/update-password-form.tsx
```

Form update password berada pada tab `Update Password` di komponen `Account`.

Alur update password:

1. User mengisi `currentPassword`, `newPassword`, dan `confirmPassword`.
2. Input divalidasi dengan `updatePasswordSchema`.
3. Form memanggil `useUpdatePassword`.
4. `useUpdatePassword` memanggil service `updatePassword`.
5. `updatePassword` mengirim request `PUT` ke `/api/user/password`.
6. API membaca user aktif melalui helper `withAuth`.
7. API melakukan validasi ulang dengan `updatePasswordSchema`.
8. API mengambil `passwordHash` user dari Prisma.
9. Jika user tidak memiliki `passwordHash`, API mengembalikan error karena user memakai Google authentication.
10. API memverifikasi `currentPassword` dengan `verifyPassword`.
11. API memastikan `newPassword` berbeda dari password lama.
12. API menyimpan password baru dengan `hashPassword`.
13. Jika berhasil, tampil toast sukses dan form di-reset.
14. Jika gagal, tampil toast gagal dengan pesan error dari API.

Schema validasi berada di:

```txt
src/modules/user/schemas/password.schema.ts
```

Aturan validasi saat ini:

```ts
export const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Password confirmation is required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
```

Service update password berada di:

```txt
src/modules/user/services/password.service.ts
```

Hook mutation berada di:

```txt
src/modules/user/hooks/use-update-password.ts
```

Tombol `Update Password` akan disabled ketika mutation sedang pending atau form belum valid.

## Settings

Komponen settings berada di:

```txt
src/modules/user/components/settings-card.tsx
```

Saat ini settings hanya berisi `Danger Zone` untuk delete account.

## Delete Account

Komponen delete account berada di:

```txt
src/modules/user/components/delete-account-button.tsx
```

Alur delete account:

1. User menekan tombol `Delete Account`.
2. Dialog konfirmasi terbuka.
3. User wajib mengetik teks `Confirm Delete Account`.
4. Tombol delete aktif hanya jika teks konfirmasi cocok.
5. Komponen memanggil `useDeleteAccount`.
6. `useDeleteAccount` memanggil service `deleteAccount`.
7. `deleteAccount` mengirim request `DELETE` ke `/api/user/profile`.
8. API membaca user aktif melalui `withAuth`.
9. API menjalankan `prisma.user.delete`.
10. Jika berhasil, tampil toast sukses.
11. Komponen menjalankan `signOut` dengan `callbackUrl` `/login`.

Service delete account berada di:

```txt
src/modules/user/services/profile.service.ts
```

Karena model Prisma memakai relasi cascade pada `Account`, `Session`, dan membership terkait, penghapusan user akan ikut menghapus data relasi yang bergantung pada user sesuai aturan schema database.

## API Profile

Route handler profile berada di:

```txt
src/app/api/user/profile/route.ts
```

Endpoint yang tersedia:

```txt
GET    /api/user/profile
PUT    /api/user/profile
DELETE /api/user/profile
```

## API Password

Route handler password berada di:

```txt
src/app/api/user/password/route.ts
```

Endpoint yang tersedia:

```txt
PUT /api/user/password
```

Endpoint ini menerima body:

```ts
{
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
```

Kemungkinan error dari API:

- `400 Bad request` jika body tidak valid.
- `400 This user does not have a password cause using Google authentication` jika user OAuth tidak memiliki password credentials.
- `400 Current password is incorrect` jika password lama salah.
- `400 New password must be different` jika password baru sama dengan password lama.

Semua endpoint memakai helper:

```txt
src/lib/with-auth
```

Jika request tidak punya session valid, helper `withAuth` yang menentukan response auth error.

Pada `PUT /api/user/profile`, image temporary yang diawali `temp/avatar/` dipindahkan ke key final:

```txt
avatar/{userId}/{fileName}
```

Jika image lama berada pada folder `avatar/` dan berbeda dari image baru, object lama akan dihapus dari object storage.

## Database

Data user berasal dari model Prisma:

```txt
prisma/schema.prisma
```

Field utama model `User`:

```txt
id
name
email
emailVerified
image
passwordHash
status
createdAt
updatedAt
```

Status user memakai enum:

```txt
ACTIVE
INACTIVE
SUSPENDED
```

## Catatan Pengembangan

- Field email ditampilkan disabled dan belum bisa diubah dari halaman profile.
- Jika menambah field profile baru, update juga `Profile`, `updateProfileSchema`, service, route handler, dan UI form.
- Jika mengubah aturan password, update juga `updatePasswordSchema`, route handler password, dan UI form.
- Jika mengubah alur avatar, update juga dokumentasi upload di `docs/Upload.MD`.
