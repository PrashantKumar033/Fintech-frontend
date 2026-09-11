import { useCallback, useEffect, useState } from "react";
import {
  getEffectiveAccess,
  getSession,
  syncMyPermissions,
  type EffectiveAccess,
} from "@/lib/auth-api";
import type { PlatformRole } from "@/lib/role-hierarchy";
import { canUsePermission } from "@/lib/ui-permissions";

export function useEffectiveAccess() {
  const [access, setAccess] = useState<EffectiveAccess | null>(() => getEffectiveAccess());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session) return;
    if (access?.identity?.id === session.identity.id) return;

    let cancelled = false;
    setLoading(true);
    void syncMyPermissions(session.accessToken)
      .then((next) => {
        if (!cancelled) setAccess(next);
      })
      .catch(() => {
        // The backend remains the source of truth. A missing permission refresh should not
        // destroy the current page; strict mode will deny protected navigation when no cache exists.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [access?.identity?.id]);

  const currentRole = getSession()?.identity.role || null;
  const can = useCallback(
    (codes: string | readonly string[], fallbackRoles: readonly PlatformRole[] = []) =>
      canUsePermission(codes, { role: currentRole, access, fallbackRoles }),
    [access, currentRole],
  );

  return { access, loading, can };
}
