# Upload

Dokumen ini menjelaskan struktur dan alur upload file pada project.

## Stack

- Next.js App Router route handler
- AWS SDK S3 client
- S3-compatible object storage, termasuk MinIO lokal
- Presigned URL untuk direct upload dari browser
- TanStack Query mutation
- `browser-image-compression` untuk kompresi image di browser

## Struktur Folder

```txt
src/modules/upload/
  hooks/
    use-upload-file.ts
  services/
    upload.service.ts
  types/
    upload.type.ts
  utils/
    compress-image.ts
    create-object-key.ts
```

Route upload berada di:

```txt
src/app/api/upload/presigned-url/route.ts
```

Helper storage berada di:

```txt
src/lib/storage.ts
src/lib/storage-url.ts
```

## Environment

Upload membutuhkan environment variable berikut:

```txt
S3_ENDPOINT
S3_ACCESS_KEY_ID
S3_SECRET_ACCESS_KEY
S3_BUCKET_NAME
S3_REGION
S3_FORCE_PATH_STYLE
NEXT_PUBLIC_S3_PUBLIC_URL
```

Untuk MinIO lokal, `S3_FORCE_PATH_STYLE=true` biasanya dibutuhkan.

`NEXT_PUBLIC_S3_PUBLIC_URL` dipakai di client untuk membentuk URL publik dari object key. Jangan menyimpan secret di variable yang diawali `NEXT_PUBLIC_`.

## Presigned URL API

Endpoint:

```txt
POST /api/upload/presigned-url
```

Request body:

```ts
{
  fileName: string;
  contentType: string;
  folder: string;
}
```

Response:

```ts
{
  key: string;
  signedUrl: string;
}
```

Jika `fileName`, `contentType`, atau `folder` kosong, API mengembalikan `400 Bad request`.

API membuat object key dengan:

```txt
src/modules/upload/utils/create-object-key.ts
```

Format key:

```txt
{folder}/{randomUUID}-{fileName}
```

Signed URL dibuat dengan `PutObjectCommand` dan berlaku selama 60 detik.

## Upload Flow

Service upload berada di:

```txt
src/modules/upload/services/upload.service.ts
```

Alur `uploadFile`:

1. Client memanggil `getPresignedUrl`.
2. API mengembalikan `key` dan `signedUrl`.
3. Client melakukan `PUT` langsung ke `signedUrl`.
4. Header `Content-Type` memakai `file.type`.
5. Jika upload sukses, service mengembalikan `{ key }`.
6. Jika upload gagal, service throw `Upload failed`.

Hook mutation berada di:

```txt
src/modules/upload/hooks/use-upload-file.ts
```

Input mutation:

```ts
{
  file: File;
  folder: string;
}
```

## Image Compression

Utility kompresi image berada di:

```txt
src/modules/upload/utils/compress-image.ts
```

Konfigurasi saat ini:

```ts
{
  maxSizeMB: 0.8,
  maxWidthOrHeight: 1024,
  useWebWorker: true,
  initialQuality: 0.85,
}
```

Kompresi dilakukan di browser sebelum file dikirim ke object storage.

## Public URL

Helper public URL berada di:

```txt
src/lib/storage-url.ts
```

Jika key sudah berupa URL yang diawali `http`, helper mengembalikan value tersebut apa adanya.

Jika key adalah object key internal, URL dibentuk dengan:

```txt
{NEXT_PUBLIC_S3_PUBLIC_URL}/{key}
```

## Storage Helpers

Storage client berada di:

```txt
src/lib/storage.ts
```

Helper yang tersedia:

- `s3Client` untuk operasi S3-compatible storage.
- `bucketName` dari `S3_BUCKET_NAME`.
- `moveObject` untuk copy object ke key baru lalu menghapus key lama.
- `deleteObject` untuk menghapus object internal.

`deleteObject` tidak menghapus value yang diawali `http`, sehingga external image URL tidak ikut dihapus dari storage internal.

## Integrasi Avatar User

Avatar profile memakai upload module di:

```txt
src/modules/user/components/profile-card.tsx
src/app/api/user/profile/route.ts
```

Alur avatar:

1. User memilih image lewat hidden file input.
2. File dikompresi dengan `compressImage`.
3. Preview lokal dibuat dengan `URL.createObjectURL`.
4. File di-upload ke folder temporary `temp/avatar`.
5. Form profile menyimpan `image` sebagai temporary object key.
6. Saat profile disimpan, API user memindahkan key `temp/avatar/...` ke `avatar/{userId}/{fileName}`.
7. Jika avatar lama adalah object internal di folder `avatar/` dan berbeda dari avatar baru, object lama dihapus.

Selama kompresi atau upload berjalan, profile card menampilkan `CircleNotchIcon` pada avatar dan men-disable tombol image/save.

## Catatan Pengembangan

- Validasi upload saat ini hanya memastikan `fileName`, `contentType`, dan `folder` tersedia.
- Jika perlu membatasi tipe file, ukuran file, atau folder yang boleh digunakan, tambahkan validasi di `/api/upload/presigned-url`.
- Jika folder upload baru ditambahkan, dokumentasikan tujuan folder dan lifecycle object-nya.
- Untuk object temporary, pastikan ada proses finalisasi atau cleanup agar object yang tidak disimpan tidak menumpuk.
