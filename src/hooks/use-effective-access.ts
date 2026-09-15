import { useCallback, useEffect, useState } from "react";
import {
  getEffectiveAccess,
  getSession,
  syncMyPermissions,
  type EffectiveAccess,
} from "@/lib/auth-api";
import type { PlatformRole } from "@/lib/role-hierarchy";
import { canUsePermission } from "@/lib/ui-permissions";

const accessRefreshes = new Map<string, Promise<EffectiveAccess>>();

function refreshEffectiveAccess(accessToken: string) {
  const existing = accessRefreshes.get(accessToken);
  if (existing) return existing;

  const request = syncMyPermissions(accessToken).finally(() => {
    if (accessRefreshes.get(accessToken) === request) {
      accessRefreshes.delete(accessToken);
    }
  });
  accessRefreshes.set(accessToken, request);
  return request;
}

export function useEffectiveAccess() {
  const [access, setAccess] = useState<EffectiveAccess | null>(() => getEffectiveAccess());
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const session = getSession();
    if (!session) return null;

    setLoading(true);
    try {
      const next = await refreshEffectiveAccess(session.accessToken);
      setAccess(next);
      return next;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const sync = () => {
      if (cancelled) return;
      void refresh().catch(() => {
        // The backend remains the source of truth. A failed refresh should not destroy the
        // current page; strict mode will deny protected actions when no cache exists.
      });
    };

    const syncWhenVisible = () => {
      if (document.visibilityState === "visible") sync();
    };

    sync();
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", syncWhenVisible);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", syncWhenVisible);
    };
  }, [refresh]);

  const currentRole = getSession()?.identity.role || null;
  const can = useCallback(
    (codes: string | readonly string[], fallbackRoles: readonly PlatformRole[] = []) =>
      canUsePermission(codes, { role: currentRole, access, fallbackRoles }),
    [access, currentRole],
  );

  return { access, loading, can, refresh };
}
