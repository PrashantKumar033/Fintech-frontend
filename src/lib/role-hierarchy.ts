import {
  getEffectiveAccess,
  type EffectiveAccess,
  type Identity,
  type Session,
} from "@/lib/auth-api";

export type PlatformRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "MASTER_DISTRIBUTOR"
  | "DISTRIBUTOR"
  | "RETAILER";

const targets: Record<PlatformRole, PlatformRole[]> = {
  SUPER_ADMIN: ["SUPER_ADMIN", "ADMIN", "MASTER_DISTRIBUTOR", "DISTRIBUTOR", "RETAILER"],
  ADMIN: ["MASTER_DISTRIBUTOR", "DISTRIBUTOR", "RETAILER"],
  MASTER_DISTRIBUTOR: ["DISTRIBUTOR", "RETAILER"],
  DISTRIBUTOR: ["RETAILER"],
  RETAILER: [],
};

const workspaceAliases: Record<string, PlatformRole> = {
  WHITE_LABEL: "ADMIN",
  ACCOUNT: "ADMIN",
  AEPS_TEAM: "ADMIN",
  EMPLOYEE: "ADMIN",
  ASM: "DISTRIBUTOR",
  TSM: "DISTRIBUTOR",
  CLIENT: "RETAILER",
};

const adminPermissionPrefixes = [
  "ADMIN.",
  "ROLE.",
  "PACKAGE.",
  "PERMISSION.",
  "BANK_ACCOUNT.",
  "KYC.REVIEW.",
  "PROVIDER_TRANSACTION.ADMIN.",
  "PROVIDER_TRANSACTION.RECONCILIATION.",
  "PROVIDER_TRANSACTION.REVERSAL.",
  "PROVIDER_INCOME.",
  "COMMISSION.RULE.",
  "COMMISSION.DISTRIBUTION.",
  "COMMISSION.HIERARCHY.",
  "FUND_REQUEST.ADMIN.",
  "AEPS.PROVIDER.",
  "AEPS.SERVICE.STATUS.",
];

function canonicalRoleName(role?: string | null): string {
  return role?.trim().toUpperCase().replace(/[ -]+/g, "_") || "";
}

export function normalizeRole(role?: string | null): PlatformRole | null {
  const value = canonicalRoleName(role);
  return value && value in targets ? (value as PlatformRole) : null;
}

/**
 * Resolves a database role to one of the route/data-scope workspaces that the
 * frontend implements. Authorization still comes exclusively from effective
 * permissions; this value only selects the correct shell and route family.
 */
export function resolveWorkspaceRole(
  role?: string | null,
  access: EffectiveAccess | null = getEffectiveAccess(),
): PlatformRole | null {
  const exact = normalizeRole(role);
  if (exact) return exact;

  const roleName = canonicalRoleName(role || access?.role?.name);
  if (!roleName) return null;
  if (workspaceAliases[roleName]) return workspaceAliases[roleName];

  const authorityLevel = Number(access?.role?.authorityLevel ?? 0);
  if (authorityLevel >= 800) return "ADMIN";
  if (authorityLevel >= 650) return "MASTER_DISTRIBUTOR";
  if (authorityLevel >= 450) return "DISTRIBUTOR";
  if (authorityLevel > 0 && authorityLevel <= 250) return "RETAILER";
  if (authorityLevel > 0) return "ADMIN";

  // Permission inference is only a fallback for legacy custom roles created
  // before authority levels were exposed in the role-management form.
  const permissionCodes = (access?.permissionCodes || []).map((code) => code.toUpperCase());
  if (
    permissionCodes.some((code) =>
      adminPermissionPrefixes.some((prefix) => code.startsWith(prefix)),
    ) ||
    permissionCodes.includes("ACCOUNT.CREATE") ||
    permissionCodes.some((code) => code.startsWith("MEMBER."))
  ) {
    return "ADMIN";
  }

  if (permissionCodes.includes("AEPS.NETWORK_TRANSACTION.VIEW")) {
    return "DISTRIBUTOR";
  }
  if (
    permissionCodes.some(
      (code) =>
        code.startsWith("AEPS.") ||
        code.startsWith("WALLET.") ||
        code === "PROVIDER_TRANSACTION.LIST",
    )
  ) {
    return "RETAILER";
  }

  // New operational roles default to the permission-filtered Admin shell.
  // This prevents a valid custom role from being sent back to /login while
  // still exposing no protected module unless its package grants permission.
  return "ADMIN";
}

export function registrationTargets(role?: string | null): PlatformRole[] {
  const normalized = normalizeRole(role);
  return normalized ? targets[normalized] : [];
}

export function isManagementRole(role?: string | null): boolean {
  const normalized = resolveWorkspaceRole(role);
  return normalized === "ADMIN" || normalized === "MASTER_DISTRIBUTOR" || normalized === "DISTRIBUTOR";
}

export function managementBasePath(role?: string | null): "/admin" | "/master-distributor" | "/distributor" {
  const normalized = resolveWorkspaceRole(role);
  if (normalized === "MASTER_DISTRIBUTOR") return "/master-distributor";
  if (normalized === "DISTRIBUTOR") return "/distributor";
  return "/admin";
}

export function credentialsPending(identity?: Identity | null): boolean {
  return Boolean(identity && (!identity.passwordChangedAt || !identity.mpinChangedAt));
}

export function identityVerificationPending(session?: Session | null): boolean {
  if (!session || !credentialsPending(session.identity)) return false;
  return !session.identity.phoneNumber || ["ADD_AND_VERIFY_PHONE", "VERIFY_PHONE_OTP", "ADD_PAN"].includes(session.nextStep || "");
}

export function signedInHome(session: Session): string {
  const role = resolveWorkspaceRole(session.identity.role);
  if (role === "SUPER_ADMIN") return "/admin";
  if (isManagementRole(role)) {
    const base = managementBasePath(role);
    if (credentialsPending(session.identity)) return identityVerificationPending(session) ? `${base}/account-setup` : `${base}/settings`;
    return base;
  }
  if (role === "RETAILER") {
    if (credentialsPending(session.identity)) return identityVerificationPending(session) ? "/retailer/account-setup" : "/retailer/settings";
    return "/retailer/dashboard";
  }
  return "/login";
}
