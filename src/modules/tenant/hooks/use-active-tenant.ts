"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  ACTIVE_TENANT_CHANGE_EVENT,
  ACTIVE_TENANT_STORAGE_KEY,
  clearActiveTenantCookie,
  getStoredActiveTenantId,
  setActiveTenantCookie,
} from "../utils/active-tenant";

const getServerSnapshot = () => null;

const subscribeToActiveTenant = (onStoreChange: () => void) => {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === ACTIVE_TENANT_STORAGE_KEY) {
      onStoreChange();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(ACTIVE_TENANT_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(ACTIVE_TENANT_CHANGE_EVENT, onStoreChange);
  };
};

const useActiveTenant = () => {
  const queryClient = useQueryClient();
  const activeTenantId = useSyncExternalStore(
    subscribeToActiveTenant,
    getStoredActiveTenantId,
    getServerSnapshot,
  );

  const invalidateTenantScopedQueries = useCallback(() => {
    const tenantScopedQueryKeys = [
      ["members"],
      ["tenant-settings"],
      ["permissions"],
      ["roles"],
      ["invitations"],
      ["web-audits"],
      ["content-generator-drafts"],
      ["content-generator-draft"],
      ["content-generator-integrations"],
      ["content-generator-indexnow"],
      ["data-audit-crawler-websites"],
      ["data-audit-crawler-website"],
      ["data-audit-crawler-page"],
      ["data-audit-crawler-crawl-jobs"],
    ] as const;

    tenantScopedQueryKeys.forEach((queryKey) => {
      queryClient.removeQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey });
    });
  }, [queryClient]);

  useEffect(() => {
    if (activeTenantId) {
      setActiveTenantCookie(activeTenantId);
    } else {
      clearActiveTenantCookie();
    }
  }, [activeTenantId]);

  const setActiveTenantId = useCallback(
    (tenantId: string) => {
      if (!tenantId || !tenantId.trim()) {
        console.error('Invalid tenant ID provided');
        return;
      }

      const previousTenantId = getStoredActiveTenantId();
      if (previousTenantId === tenantId) {
        setActiveTenantCookie(tenantId);
        return;
      }
      window.localStorage.setItem(ACTIVE_TENANT_STORAGE_KEY, tenantId);
      setActiveTenantCookie(tenantId);
      window.dispatchEvent(new Event(ACTIVE_TENANT_CHANGE_EVENT));
      invalidateTenantScopedQueries();
    },
    [invalidateTenantScopedQueries],
  );

  return useMemo(
    () => ({
      activeTenantId,
      setActiveTenantId,
    }),
    [activeTenantId, setActiveTenantId],
  );
};

export { useActiveTenant };
