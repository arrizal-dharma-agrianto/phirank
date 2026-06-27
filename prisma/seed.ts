import {
  PrismaClient,
  TenantStatus,
  UserStatus,
} from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const tenantSeed = {
  name: "Acme Corporation",
  slug: "acme-corp",
  status: TenantStatus.ACTIVE,
  settings: {
    timezone: "Asia/Jakarta",
    locale: "en",
    currency: "USD",
  },
};

const permissionData = [
  { key: "members.read", name: "View Members", group: "Members" },
  { key: "members.invite", name: "Invite Members", group: "Members" },
  { key: "members.remove", name: "Remove Members", group: "Members" },
  {
    key: "members.update_role",
    name: "Update Member Roles",
    group: "Members",
  },
  { key: "roles.read", name: "View Roles", group: "Roles" },
  { key: "roles.manage", name: "Manage Roles", group: "Roles" },
  { key: "settings.manage", name: "Manage Settings", group: "Settings" },
  { key: "projects.read", name: "View Projects", group: "Projects" },
  { key: "projects.create", name: "Create Projects", group: "Projects" },
  { key: "projects.update", name: "Update Projects", group: "Projects" },
  { key: "projects.delete", name: "Delete Projects", group: "Projects" },
  { key: "analytics.read", name: "View Analytics", group: "Analytics" },
  { key: "audit_logs.read", name: "View Audit Logs", group: "Audit" },
] as const;

const systemRoles = [
  {
    name: "Owner",
    slug: "owner",
    description: "Full access to all features",
    isSystem: true,
    isDefault: false,
    permissionKeys: permissionData.map((permission) => permission.key),
  },
  {
    name: "Admin",
    slug: "admin",
    description: "Manage members and content, without billing access",
    isSystem: true,
    isDefault: false,
    permissionKeys: [
      "members.read",
      "members.invite",
      "members.remove",
      "members.update_role",
      "roles.read",
      "projects.read",
      "projects.create",
      "projects.update",
      "projects.delete",
      "analytics.read",
      "audit_logs.read",
    ],
  },
  {
    name: "Member",
    slug: "member",
    description: "Basic workspace access for team members",
    isSystem: true,
    isDefault: true,
    permissionKeys: ["members.read", "projects.read", "analytics.read"],
  },
] as const;

const usersData = [
  {
    name: "Olivia Owner",
    email: "admin@acme.com",
    roleSlug: "owner",
  },
  {
    name: "Mason Member",
    email: "member@acme.com",
    roleSlug: "member",
  },
  {
    name: "Ava Admin",
    email: "manager@acme.com",
    roleSlug: "admin",
  },
] as const;

async function main() {
  console.log("Starting seed...\n");

  console.log("Seeding permissions...");

  for (const permission of permissionData) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: {
        name: permission.name,
        group: permission.group,
      },
      create: permission,
    });
  }

  const allPermissions = await prisma.permission.findMany();
  const permissionIdByKey = new Map(
    allPermissions.map((permission) => [permission.key, permission.id]),
  );

  console.log(`   OK ${allPermissions.length} permissions seeded`);

  console.log("\nSeeding system roles...");

  for (const roleSeed of systemRoles) {
    const permissionIds = roleSeed.permissionKeys.map((permissionKey) => {
      const permissionId = permissionIdByKey.get(permissionKey);

      if (!permissionId) {
        throw new Error(`Permission not found for key: ${permissionKey}`);
      }

      return permissionId;
    });

    const existingRole = await prisma.role.findFirst({
      where: {
        slug: roleSeed.slug,
        tenantId: null,
      },
      select: { id: true },
    });

    if (existingRole) {
      await prisma.role.update({
        where: { id: existingRole.id },
        data: {
          name: roleSeed.name,
          description: roleSeed.description,
          isSystem: roleSeed.isSystem,
          isDefault: roleSeed.isDefault,
        },
      });

      await prisma.rolePermission.deleteMany({
        where: { roleId: existingRole.id },
      });

      await prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId: existingRole.id,
          permissionId,
        })),
      });

      console.log(`   Updated role "${roleSeed.name}"`);
      continue;
    }

    await prisma.role.create({
      data: {
        tenantId: null,
        name: roleSeed.name,
        slug: roleSeed.slug,
        description: roleSeed.description,
        isSystem: roleSeed.isSystem,
        isDefault: roleSeed.isDefault,
        permissions: {
          create: permissionIds.map((permissionId) => ({ permissionId })),
        },
      },
    });

    console.log(`   Created role "${roleSeed.name}"`);
  }

  console.log("\nSeeding tenant...");

  const tenant = await prisma.tenant.upsert({
    where: { slug: tenantSeed.slug },
    update: {
      name: tenantSeed.name,
      status: tenantSeed.status,
      settings: {
        upsert: {
          update: tenantSeed.settings,
          create: tenantSeed.settings,
        },
      },
    },
    create: {
      name: tenantSeed.name,
      slug: tenantSeed.slug,
      status: tenantSeed.status,
      settings: {
        create: tenantSeed.settings,
      },
    },
  });

  console.log(`   OK tenant "${tenant.name}" (${tenant.id})`);

  console.log("\nSeeding users...");

  const passwordHash = await hash("password123", 12);

  const seededRoles = await prisma.role.findMany({
    where: {
      tenantId: null,
      slug: {
        in: systemRoles.map((role) => role.slug),
      },
    },
    select: {
      id: true,
      slug: true,
    },
  });

  const roleIdBySlug = new Map(seededRoles.map((role) => [role.slug, role.id]));

  for (const userSeed of usersData) {
    const roleId = roleIdBySlug.get(userSeed.roleSlug);

    if (!roleId) {
      throw new Error(`Role not found for slug: ${userSeed.roleSlug}`);
    }

    const user = await prisma.user.upsert({
      where: { email: userSeed.email },
      update: {
        name: userSeed.name,
        emailVerified: new Date(),
        passwordHash,
        status: UserStatus.ACTIVE,
      },
      create: {
        name: userSeed.name,
        email: userSeed.email,
        emailVerified: new Date(),
        passwordHash,
        status: UserStatus.ACTIVE,
      },
    });

    await prisma.tenantMember.upsert({
      where: {
        userId_tenantId: {
          userId: user.id,
          tenantId: tenant.id,
        },
      },
      update: {
        roleId,
      },
      create: {
        userId: user.id,
        tenantId: tenant.id,
        roleId,
        joinedAt: new Date(),
      },
    });

    console.log(`   OK user "${userSeed.email}" -> role: ${userSeed.roleSlug}`);
  }

  console.log("\nSeed completed.\n");
  console.log("-----------------------------------");
  console.log("Login credentials:");
  console.log("   admin@acme.com   -> password123 (Owner)");
  console.log("   manager@acme.com -> password123 (Admin)");
  console.log("   member@acme.com  -> password123 (Member)");
  console.log("-----------------------------------\n");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
