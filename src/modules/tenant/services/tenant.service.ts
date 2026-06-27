import { UpdateTenantInput } from "../schemas";
import { getActiveTenantHeaders } from "../utils/active-tenant";
import type { Tenant, TenantSettings } from "../types";

type UpdateTenantParams = {
  tenantId: string;
  data: UpdateTenantInput;
};

const getMyTenants = async (): Promise<Tenant[]> => {
  const res = await fetch("/api/tenants");

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message ?? "Failed to get tenants");
  }

  return data;
};

type CreateTenantPayload = {
  name: string;
};

const createTenant = async (payload: CreateTenantPayload): Promise<Tenant> => {
  const response = await fetch("/api/tenants", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message ?? "Failed to create tenant");
  }

  return result;
};

const updateTenant = async ({ tenantId, data }: UpdateTenantParams) => {
  const res = await fetch(`/api/tenants/${tenantId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result = await res.json();

  if (!res.ok) {
    throw new Error(result.message ?? "Failed to update tenant");
  }

  return result;
}

const deleteTenant = async (tenantId: string) => {
  const res = await fetch(`/api/tenants/${tenantId}`, {
    method: "DELETE",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message ?? "Failed to delete tenant");
  }

  return data;
}

const getTenantSettings = async (): Promise<TenantSettings> => {
  const res = await fetch("/api/tenant-settings", {
    headers: getActiveTenantHeaders(),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message ?? "Failed to get tenant settings");
  }

  return data;
};

const updateTenantSettings = async (input: {
  showSetupProgress?: boolean;
}): Promise<TenantSettings> => {
  const res = await fetch("/api/tenant-settings", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getActiveTenantHeaders(),
    },
    body: JSON.stringify(input),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message ?? "Failed to update tenant settings");
  }

  return data;
};

export {
  getMyTenants,
  createTenant,
  deleteTenant,
  getTenantSettings,
  updateTenant,
  updateTenantSettings,
};
