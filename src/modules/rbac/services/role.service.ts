import type {
  RoleWithPermissions,
  CreateRoleInput,
  UpdateRoleInput,
  TenantMemberWithRole,
} from "../types";
import { getActiveTenantHeaders } from "@/modules/tenant/utils/active-tenant";

// --- Roles ---

const getRoles = async (): Promise<RoleWithPermissions[]> => {
  const res = await fetch("/api/rbac/roles", {
    headers: getActiveTenantHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Failed to fetch roles.");
  return data;
};

const getAssignableRoles = async (): Promise<RoleWithPermissions[]> => {
  const res = await fetch("/api/rbac/roles?scope=assignable", {
    headers: getActiveTenantHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message ?? "Failed to fetch assignable roles.");
  }
  return data;
};

const getRole = async (roleId: string): Promise<RoleWithPermissions> => {
  const res = await fetch(`/api/rbac/roles/${roleId}`, {
    headers: getActiveTenantHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Failed to fetch role.");
  return data;
};

const getMembers = async (): Promise<TenantMemberWithRole[]> => {
  const res = await fetch("/api/members", {
    headers: getActiveTenantHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Failed to fetch members.");
  return data;
};

const createRole = async (
  input: CreateRoleInput,
): Promise<RoleWithPermissions> => {
  const res = await fetch("/api/rbac/roles", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getActiveTenantHeaders(),
    },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Failed to create role.");
  return data;
};

const updateRole = async (
  roleId: string,
  input: UpdateRoleInput,
): Promise<RoleWithPermissions> => {
  const res = await fetch(`/api/rbac/roles/${roleId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getActiveTenantHeaders(),
    },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Failed to update role.");
  return data;
};

const deleteRole = async (roleId: string): Promise<void> => {
  const res = await fetch(`/api/rbac/roles/${roleId}`, {
    method: "DELETE",
    headers: getActiveTenantHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Failed to delete role.");
};

const deleteMember = async (memberId: string): Promise<void> => {
  const res = await fetch(`/api/members/${encodeURIComponent(memberId)}`, {
    method: "DELETE",
    headers: getActiveTenantHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Failed to remove member.");
};

export {
  getRoles,
  getAssignableRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  getMembers,
  deleteMember,
};
