import { z } from "zod";

const roleFieldsSchema = z.object({
  name: z.string().min(2, "Minimal 2 karakter").max(50),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Hanya huruf kecil, angka, dan tanda hubung"),
  description: z.string().max(200).optional(),
});

const permissionIdsSchema = z.array(z.string());

export const createRoleSchema = roleFieldsSchema.extend({
  permissionIds: permissionIdsSchema.default([]),
});

export const updateRoleSchema = roleFieldsSchema.partial().extend({
  permissionIds: permissionIdsSchema.optional(),
});

export const assignRoleSchema = z.object({
  memberId: z.string(),
  roleId: z.string(),
});

export type CreateRoleSchema = z.input<typeof createRoleSchema>;
export type CreateRoleOutput = z.output<typeof createRoleSchema>;
export type UpdateRoleSchema = z.infer<typeof updateRoleSchema>;
export type AssignRoleSchema = z.infer<typeof assignRoleSchema>;
