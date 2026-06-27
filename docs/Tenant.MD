# Tenant

Dokumen ini menjelaskan struktur tenant, alur pemilihan tenant aktif, seed data, dan integrasi tenant dengan RBAC.

## Stack

- Prisma untuk model tenant, member, role, permission, dan settings
- Next.js App Router route handler untuk API tenant
- TanStack Query untuk fetch dan mutation tenant
- Local storage untuk menyimpan tenant aktif di sisi client
- Cookie `activeTenantId` untuk membuat tenant aktif terbaca oleh API/server authorization
- RBAC module untuk permission dan role per tenant

## Struktur Folder

```txt
src/app/api/tenants/route.ts
src/lib/authorization.ts
src/modules/tenant/
  components/
    create-tenant-dialog.tsx
    tenant-switcher.tsx
  hooks/
    use-active-tenant.ts
    use-create-tenant.ts
    use-tenant.ts
  schemas/
    create-tenant.schema.ts
  services/
    tenant.service.ts
  types/
    tenant.type.ts
```

File Prisma terkait:

```txt
prisma/schema.prisma
prisma/seed.ts
```

## Model Data

Model tenant utama berada di `prisma/schema.prisma`.

```txt
Tenant
TenantSettings
TenantMember
Role
Permission
RolePermission
TenantInvitation
```

Relasi penting:

- `Tenant` memiliki banyak `TenantMember`.
- `Tenant` memiliki satu `TenantSettings`.
- `TenantMember` menghubungkan `User`, `Tenant`, dan `Role`.
- `Role` dapat bersifat global jika `tenantId = null`, atau tenant-specific jika `tenantId` berisi id tenant.
- `Permission` adalah daftar permission global.
- `RolePermission` menghubungkan role dengan permission.

`TenantMember` memiliki unique constraint:

```txt
@@unique([userId, tenantId])
```

Artinya satu user hanya bisa memiliki satu membership untuk tenant yang sama.

## Seed Tenant

Seed awal berada di:

```txt
prisma/seed.ts
```

Seed membuat tenant default:

```txt
Acme Corporation
slug: acme-corp
status: ACTIVE
timezone: Asia/Jakarta
locale: en
currency: USD
```

Seed juga membuat permission, system roles, dan user demo:

```txt
admin@acme.com   -> password123 (Owner)
manager@acme.com -> password123 (Admin)
member@acme.com  -> password123 (Member)
```

Role global yang dibuat seed:

- Owner
- Admin
- Member

Role tersebut dibuat dengan `tenantId = null`, lalu dipakai sebagai role membership tenant seed.

## API Tenant

API tenant berada di:

```txt
src/app/api/tenants/route.ts
```

### GET /api/tenants

Mengembalikan semua membership tenant milik user yang sedang login.

Response:

```ts
type Tenant = {
  membershipId: string;
  role: {
    name: string;
    slug: string;
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
    status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  };
};
```

Data diurutkan berdasarkan `TenantMember.createdAt` dari yang paling awal.

### POST /api/tenants

Membuat tenant baru untuk user yang sedang login.

Payload:

```ts
{
  name: string;
}
```

Alur create tenant:

1. Validasi input dengan `createTenantSchema`.
2. Generate slug dari nama tenant.
3. Jika slug sudah dipakai, tambahkan suffix random.
4. Buat `Tenant`.
5. Buat `TenantSettings` default.
6. Buat role `Owner` khusus tenant baru.
7. Buat `TenantMember` untuk user login sebagai owner.
8. Return data membership dengan bentuk yang sama seperti item `GET /api/tenants`.

Response sengaja dibuat sama seperti list tenant agar UI bisa langsung memilih tenant baru tanpa menunggu refetch selesai.

## Tenant Switcher

Tenant switcher berada di:

```txt
src/modules/tenant/components/tenant-switcher.tsx
```

Komponen ini:

- Mengambil daftar tenant lewat `useMyTenants`.
- Menampilkan tenant aktif di sidebar.
- Menampilkan list tenant dalam dropdown.
- Mengubah tenant aktif saat user memilih tenant lain.
- Membuka dialog create tenant.
- Otomatis memilih tenant baru setelah create tenant berhasil.

Jika user belum punya tenant, switcher menampilkan tombol create tenant.

## Tenant Aktif

State tenant aktif dikelola oleh:

```txt
src/modules/tenant/hooks/use-active-tenant.ts
```

Hook ini memakai dua storage:

```txt
localStorage: active-tenant-id
cookie: activeTenantId
```

`localStorage` dipakai agar pilihan tenant tetap tersimpan di browser.

Cookie `activeTenantId` dipakai karena API route dan server authorization tidak bisa membaca `localStorage`. Dengan cookie, server dapat menentukan tenant context sesuai tenant yang dipilih user.

Saat tenant aktif berubah, hook akan:

1. Menyimpan tenant id ke `localStorage`.
2. Menyimpan tenant id ke cookie `activeTenantId`.
3. Mengubah state client.
4. Meng-invalidate query tenant-scoped.

Query yang di-invalidate:

```txt
members
permissions
roles
```

Hook ini juga mendengarkan event `storage`, sehingga perubahan tenant aktif dari tab lain bisa ikut tersinkron.

## Authorization Context

Authorization context berada di:

```txt
src/lib/authorization.ts
```

Fungsi utama:

```ts
getAuthorizationContext(userId)
```

Fungsi ini membaca cookie:

```txt
activeTenantId
```

Jika cookie berisi tenant id yang valid untuk user tersebut, authorization context memakai membership tenant itu.

Jika cookie kosong atau tenant id sudah tidak valid, authorization fallback ke membership pertama user berdasarkan `createdAt`.

Authorization context mengembalikan:

```ts
{
  membershipId: string;
  userId: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  tenantStatus: string;
  roleId: string;
  roleName: string;
  roleSlug: string;
  permissionKeys: string[];
}
```

Context ini dipakai oleh endpoint RBAC dan members untuk membatasi data sesuai tenant aktif.

## Query Tenant-Scoped

Beberapa query RBAC memakai `activeTenantId` sebagai bagian dari query key.

Contoh:

```ts
queryKey: ["roles", activeTenantId]
queryKey: ["members", activeTenantId]
queryKey: ["permissions", activeTenantId]
```

Tujuannya agar data tenant lama tidak muncul dari cache saat user berpindah tenant.

## Create Tenant

Dialog create tenant berada di:

```txt
src/modules/tenant/components/create-tenant-dialog.tsx
```

Mutation berada di:

```txt
src/modules/tenant/hooks/use-create-tenant.ts
```

Setelah create berhasil:

1. Response tenant baru dimasukkan ke cache `["my-tenants"]`.
2. Query `["my-tenants"]` di-invalidate.
3. Dialog memanggil callback `onTenantCreated`.
4. Tenant switcher menyimpan tenant baru sebagai tenant aktif.

## Catatan Keamanan

- Server tidak mempercayai cookie secara langsung sebagai bukti akses.
- `activeTenantId` hanya dipakai untuk memilih membership.
- `getAuthorizationContext` tetap mencari `TenantMember` dengan kombinasi `userId` dan `tenantId`.
- Jika user tidak punya membership untuk tenant id dari cookie, sistem fallback ke tenant pertama user.
- Permission tetap dihitung dari role membership user pada tenant aktif.

## Catatan Implementasi

- Gunakan `useActiveTenant` ketika fitur client perlu mengetahui tenant aktif.
- Untuk endpoint server, gunakan `getAuthorizationContext` agar tenant aktif dan permission dihitung konsisten.
- Untuk data yang tenant-scoped, masukkan `activeTenantId` ke query key TanStack Query.
- Jangan pakai tenant id dari client body sebagai sumber otorisasi utama. Gunakan membership dari `getAuthorizationContext`.
