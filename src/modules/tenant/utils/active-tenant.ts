const ACTIVE_TENANT_STORAGE_KEY = "active-tenant-id";
const ACTIVE_TENANT_COOKIE_KEY = "activeTenantId";
const ACTIVE_TENANT_HEADER = "x-active-tenant-id";
const ACTIVE_TENANT_CHANGE_EVENT = "active-tenant-change";

const setActiveTenantCookie = (tenantId: string) => {
  if (!tenantId || typeof tenantId !== 'string') {
    throw new Error('Invalid tenant ID');
  }

  document.cookie = `${ACTIVE_TENANT_COOKIE_KEY}=${encodeURIComponent(
    tenantId,
  )}; path=/; max-age=31536000; SameSite=Lax; Secure`;
};

const clearActiveTenantCookie = () => {
  document.cookie = `${ACTIVE_TENANT_COOKIE_KEY}=; path=/; max-age=0; SameSite=Lax; Secure`;
};

const getStoredActiveTenantId = () => {
  if (typeof window === "undefined") return null;

  return window.localStorage.getItem(ACTIVE_TENANT_STORAGE_KEY);
};

const getActiveTenantHeaders = () => {
  const tenantId = getStoredActiveTenantId();

  return tenantId ? { [ACTIVE_TENANT_HEADER]: tenantId } : undefined;
};

export {
  ACTIVE_TENANT_CHANGE_EVENT,
  ACTIVE_TENANT_COOKIE_KEY,
  ACTIVE_TENANT_HEADER,
  ACTIVE_TENANT_STORAGE_KEY,
  clearActiveTenantCookie,
  getActiveTenantHeaders,
  getStoredActiveTenantId,
  setActiveTenantCookie,
};
