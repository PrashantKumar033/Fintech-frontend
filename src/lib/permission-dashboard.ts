import { useCallback } from "react";
import { useEffectiveAccess } from "@/hooks/use-effective-access";
import { getAdminActor } from "@/lib/admin-api";
import { getSession } from "@/lib/auth-api";
import type { PlatformRole } from "@/lib/role-hierarchy";
import { canAccessUiArea, type UiArea } from "@/lib/ui-permissions";

export type DashboardFeatureKey =
  | "wallet"
  | "transactions"
  | "network"
  | "aeps"
  | "bankAccount"
  | "bankOperations"
  | "kycSelf"
  | "kycReview"
  | "commission"
  | "commissionSetup"
  | "settlements"
  | "access"
  | "reports"
  | "activity"
  | "support";

/** Dashboard capabilities reuse the same permission areas as routes and navigation. */
export const DASHBOARD_FEATURES: Readonly<Record<DashboardFeatureKey, UiArea>> = {
  wallet: "wallet",
  transactions: "transactions",
  network: "members",
  aeps: "aeps",
  bankAccount: "bankAccounts",
  bankOperations: "banking",
  kycSelf: "kycSelf",
  kycReview: "kyc",
  commission: "earnings",
  commissionSetup: "commissions",
  settlements: "settlements",
  access: "access",
  reports: "reports",
  activity: "activity",
  support: "support",
};

export function usePermissionDashboard() {
  const actor = getAdminActor();
  const role = getSession()?.identity.role || actor?.role;
  const { access, loading, can } = useEffectiveAccess();
  const actorKind = actor?.kind;
  const dedicatedSuperAdmin = actorKind === "SUPER_ADMIN";

  const canShow = useCallback(
    (feature: DashboardFeatureKey) =>
      canAccessUiArea(DASHBOARD_FEATURES[feature], {
        role,
        access: actorKind === "IDENTITY_ADMIN" || !actorKind ? access : null,
        dedicatedSuperAdmin,
      }),
    [access, actorKind, dedicatedSuperAdmin, role],
  );

  const canPermission = useCallback(
    (codes: string | readonly string[], fallbackRoles: readonly PlatformRole[] = []) =>
      dedicatedSuperAdmin || can(codes, fallbackRoles),
    [can, dedicatedSuperAdmin],
  );

  return { access, loading, canShow, canPermission };
}
