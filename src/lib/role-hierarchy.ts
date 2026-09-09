import type { Identity, Session } from "@/lib/auth-api";

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

export function normalizeRole(role?: string | null): PlatformRole | null {
  const value = role?.trim().toUpperCase().replace(/[ -]+/g, "_");
  return value && value in targets ? (value as PlatformRole) : null;
}

export function registrationTargets(role?: string | null): PlatformRole[] {
  const normalized = normalizeRole(role);
  return normalized ? targets[normalized] : [];
}

export function isManagementRole(role?: string | null): boolean {
  const normalized = normalizeRole(role);
  return normalized === "ADMIN" || normalized === "MASTER_DISTRIBUTOR" || normalized === "DISTRIBUTOR";
}

export function managementBasePath(role?: string | null): "/admin" | "/master-distributor" | "/distributor" {
  const normalized = normalizeRole(role);
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
  const role = normalizeRole(session.identity.role);
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
