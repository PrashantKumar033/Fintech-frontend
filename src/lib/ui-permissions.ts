import type { EffectiveAccess } from "@/lib/auth-api";
import { normalizeRole, type PlatformRole } from "@/lib/role-hierarchy";

/**
 * Frontend permission contract.
 *
 * The Auth service stores permission codes in uppercase dot notation.
 * Keep these codes in sync with the backend permission seed/catalog.
 */
export const UI_PERMISSION = {
  ADMIN_DASHBOARD_VIEW: "ADMIN.DASHBOARD.VIEW",
  TRANSACTION_VIEW: "TRANSACTION.VIEW",
  TRANSACTION_RECONCILIATION_VIEW: "TRANSACTION.RECONCILIATION.VIEW",
  TRANSACTION_RECONCILIATION_RESOLVE: "TRANSACTION.RECONCILIATION.RESOLVE",
  TRANSACTION_REVERSAL_REQUEST: "TRANSACTION.REVERSAL.REQUEST",
  TRANSACTION_REVERSAL_PROCESS: "TRANSACTION.REVERSAL.PROCESS",
  TRANSACTION_FINANCIAL_RECOVERY: "TRANSACTION.FINANCIAL_RECOVERY",
  TRANSACTION_PROVIDER_INCOME_VIEW: "TRANSACTION.PROVIDER_INCOME.VIEW",
  TRANSACTION_PROVIDER_INCOME_RECONCILE: "TRANSACTION.PROVIDER_INCOME.RECONCILE",

  KYC_VIEW: "KYC.VIEW",
  KYC_MANAGE: "KYC.MANAGE",
  BANK_VIEW: "BANK.VIEW",
  BANK_MANAGE: "BANK.MANAGE",

  WALLET_VIEW: "WALLET.VIEW",
  WALLET_TRANSFER: "WALLET.TRANSFER",

  AEPS_VIEW: "AEPS.VIMOPAY.STATUS.VIEW",
  AEPS_BANKS_VIEW: "AEPS.VIMOPAY.BANKS.VIEW",
  AEPS_STATES_VIEW: "AEPS.VIMOPAY.STATUS.VIEW",
  AEPS_DISTRICTS_VIEW: "AEPS.VIMOPAY.DISTRICTS.VIEW",
  AEPS_BANK_IINS_VIEW: "AEPS.VIMOPAY.BANK_IINS.VIEW",
  AEPS_ONBOARDING: "AEPS.VIMOPAY.ONBOARDING.REGISTER",
  AEPS_BALANCE_ENQUIRY: "AEPS.BALANCE_ENQUIRY.CREATE",
  AEPS_MINI_STATEMENT: "AEPS.MINI_STATEMENT.CREATE",
  AEPS_CASH_WITHDRAWAL: "AEPS.CASH_WITHDRAWAL.CREATE",
  AEPS_AADHAAR_PAY: "AEPS.AADHAAR_PAY.CREATE",
  AEPS_CASH_DEPOSIT: "AEPS.CASH_DEPOSIT.CREATE",

  ACCOUNT_CREATE: "ACCOUNT.CREATE",
  MEMBER_LIST: "MEMBER.LIST",
  MEMBER_VIEW: "MEMBER.VIEW",
  MEMBER_STATUS_UPDATE: "MEMBER.STATUS.UPDATE",
  MEMBER_MANAGE: "MEMBER.MANAGE",
  BANK_ACCOUNT_LIST: "BANK_ACCOUNT.LIST",
  BANK_ACCOUNT_VIEW: "BANK_ACCOUNT.VIEW",
  PROVIDER_INCOME_VIEW: "PROVIDER_INCOME.VIEW",
  PROVIDER_INCOME_RECONCILE: "PROVIDER_INCOME.RECONCILE",
  AEPS_MERCHANT_STATUS_UPDATE: "AEPS.MERCHANT.STATUS.UPDATE",
  WALLET_LEDGER_VIEW: "WALLET.LEDGER.VIEW",
  AEPS_PROVIDER_STATUS_VIEW: "AEPS.PROVIDER.STATUS.VIEW",
  AEPS_PROVIDER_SERVICE_STATUS_UPDATE: "AEPS.PROVIDER.SERVICE.STATUS.UPDATE",

  COMMISSION_RULE_VIEW: "COMMISSION.RULE.VIEW",
  COMMISSION_RULE_CREATE: "COMMISSION.RULE.CREATE",
  COMMISSION_RULE_UPDATE: "COMMISSION.RULE.UPDATE",
  COMMISSION_RULE_DEACTIVATE: "COMMISSION.RULE.DEACTIVATE",
  COMMISSION_DISTRIBUTION_VIEW: "COMMISSION.DISTRIBUTION.VIEW",
  COMMISSION_DISTRIBUTION_CREATE: "COMMISSION.DISTRIBUTION.CREATE",
  COMMISSION_DISTRIBUTION_UPDATE: "COMMISSION.DISTRIBUTION.UPDATE",
  COMMISSION_DISTRIBUTION_DEACTIVATE: "COMMISSION.DISTRIBUTION.DEACTIVATE",
  COMMISSION_HIERARCHY_VIEW: "COMMISSION.HIERARCHY.VIEW",
  COMMISSION_HIERARCHY_CREATE: "COMMISSION.HIERARCHY.CREATE",
  COMMISSION_HIERARCHY_UPDATE: "COMMISSION.HIERARCHY.UPDATE",
  COMMISSION_HIERARCHY_DELETE: "COMMISSION.HIERARCHY.DELETE",

  ROLE_VIEW: "ROLE.VIEW",
  PERMISSION_VIEW: "PERMISSION.VIEW",
  PACKAGE_VIEW: "PACKAGE.VIEW",
  ACCESS_MANAGE: "ACCESS.MANAGE",

  AUDIT_VIEW: "AUDIT.VIEW",
  REPORT_VIEW: "REPORT.VIEW",
  SETTLEMENT_VIEW: "SETTLEMENT.VIEW",
  SUPPORT_VIEW: "SUPPORT.VIEW",
  API_SETTINGS_VIEW: "API_SETTINGS.VIEW",
  LEGAL_VIEW: "LEGAL.VIEW",
  SMS_SETTINGS_VIEW: "SMS_SETTINGS.VIEW",
} as const;

export type UiArea =
  | "dashboard"
  | "profile"
  | "members"
  | "transactions"
  | "banking"
  | "kyc"
  | "aeps"
  | "wallet"
  | "earnings"
  | "commissions"
  | "settlements"
  | "access"
  | "reports"
  | "api"
  | "settings"
  | "legal"
  | "support"
  | "sms";

type AreaRule = {
  anyOf?: readonly string[];
  allOf?: readonly string[];
};

const areaRules: Record<UiArea, AreaRule> = {
  dashboard: {},
  profile: {},
  settings: {},
  members: {
    anyOf: [
      UI_PERMISSION.MEMBER_LIST,
      UI_PERMISSION.MEMBER_VIEW,
      UI_PERMISSION.MEMBER_STATUS_UPDATE,
      UI_PERMISSION.MEMBER_MANAGE,
      UI_PERMISSION.ACCOUNT_CREATE,
    ],
  },
  transactions: {
    anyOf: [
      UI_PERMISSION.TRANSACTION_VIEW,
      UI_PERMISSION.TRANSACTION_RECONCILIATION_VIEW,
      UI_PERMISSION.TRANSACTION_RECONCILIATION_RESOLVE,
      UI_PERMISSION.TRANSACTION_REVERSAL_REQUEST,
      UI_PERMISSION.TRANSACTION_REVERSAL_PROCESS,
      UI_PERMISSION.TRANSACTION_PROVIDER_INCOME_VIEW,
    ],
  },
  banking: {
    anyOf: [
      UI_PERMISSION.BANK_ACCOUNT_LIST,
      UI_PERMISSION.BANK_ACCOUNT_VIEW,
      UI_PERMISSION.BANK_VIEW,
      UI_PERMISSION.BANK_MANAGE,
    ],
  },
  kyc: { anyOf: [UI_PERMISSION.KYC_VIEW, UI_PERMISSION.KYC_MANAGE] },
  aeps: {
    anyOf: [
      UI_PERMISSION.AEPS_VIEW,
      UI_PERMISSION.AEPS_BANKS_VIEW,
      UI_PERMISSION.AEPS_STATES_VIEW,
      UI_PERMISSION.AEPS_DISTRICTS_VIEW,
      UI_PERMISSION.AEPS_BANK_IINS_VIEW,
      UI_PERMISSION.AEPS_ONBOARDING,
      UI_PERMISSION.AEPS_BALANCE_ENQUIRY,
      UI_PERMISSION.AEPS_MINI_STATEMENT,
      UI_PERMISSION.AEPS_CASH_WITHDRAWAL,
      UI_PERMISSION.AEPS_AADHAAR_PAY,
      UI_PERMISSION.AEPS_CASH_DEPOSIT,
      UI_PERMISSION.AEPS_MERCHANT_STATUS_UPDATE,
      UI_PERMISSION.AEPS_PROVIDER_STATUS_VIEW,
      UI_PERMISSION.AEPS_PROVIDER_SERVICE_STATUS_UPDATE,
    ],
  },
  wallet: {
    anyOf: [
      UI_PERMISSION.WALLET_VIEW,
      UI_PERMISSION.WALLET_TRANSFER,
      UI_PERMISSION.WALLET_LEDGER_VIEW,
    ],
  },
  earnings: {
    anyOf: [UI_PERMISSION.TRANSACTION_VIEW, UI_PERMISSION.WALLET_VIEW],
  },
  commissions: {
    anyOf: [
      UI_PERMISSION.COMMISSION_RULE_VIEW,
      UI_PERMISSION.COMMISSION_DISTRIBUTION_VIEW,
      UI_PERMISSION.COMMISSION_HIERARCHY_VIEW,
    ],
  },
  settlements: {
    anyOf: [UI_PERMISSION.SETTLEMENT_VIEW, UI_PERMISSION.WALLET_VIEW],
  },
  access: {
    anyOf: [
      UI_PERMISSION.ACCESS_MANAGE,
      UI_PERMISSION.ROLE_VIEW,
      UI_PERMISSION.PERMISSION_VIEW,
      UI_PERMISSION.PACKAGE_VIEW,
    ],
  },
  reports: { anyOf: [UI_PERMISSION.REPORT_VIEW, UI_PERMISSION.AUDIT_VIEW] },
  api: { anyOf: [UI_PERMISSION.API_SETTINGS_VIEW] },
  legal: { anyOf: [UI_PERMISSION.LEGAL_VIEW] },
  support: { anyOf: [UI_PERMISSION.SUPPORT_VIEW] },
  sms: { anyOf: [UI_PERMISSION.SMS_SETTINGS_VIEW, UI_PERMISSION.SUPPORT_VIEW] },
};

const compatRoleAreas: Record<PlatformRole, readonly UiArea[]> = {
  SUPER_ADMIN: [
    "dashboard",
    "profile",
    "members",
    "transactions",
    "banking",
    "kyc",
    "aeps",
    "wallet",
    "earnings",
    "commissions",
    "settlements",
    "access",
    "reports",
    "api",
    "settings",
    "legal",
    "support",
    "sms",
  ],
  ADMIN: [
    "dashboard",
    "profile",
    "members",
    "transactions",
    "banking",
    "kyc",
    "aeps",
    "wallet",
    "earnings",
    "commissions",
    "settlements",
    "reports",
    "settings",
  ],
  MASTER_DISTRIBUTOR: [
    "dashboard",
    "profile",
    "members",
    "transactions",
    "banking",
    "kyc",
    "aeps",
    "wallet",
    "earnings",
    "commissions",
    "reports",
    "settings",
    "support",
  ],
  DISTRIBUTOR: [
    "dashboard",
    "profile",
    "members",
    "transactions",
    "banking",
    "aeps",
    "wallet",
    "earnings",
    "commissions",
    "reports",
    "settings",
    "support",
  ],
  RETAILER: [
    "dashboard",
    "profile",
    "transactions",
    "banking",
    "kyc",
    "aeps",
    "wallet",
    "earnings",
    "reports",
    "settings",
  ],
};

export function normalizePermissionCode(value: string): string {
  return value.trim().toUpperCase();
}

// The transaction gateway currently contains three legacy hyphenated codes,
// while permission management accepts uppercase dot/underscore notation.
// Treat both spellings as equivalent during the backend migration.
const permissionAliases: Record<string, readonly string[]> = {
  "AEPS.VIMOPAY.STATUS.VIEW": ["AEPS.VIEW"],
  "AEPS.VIMOPAY.ONBOARDING.REGISTER": ["AEPS.ONBOARDING"],
  "AEPS.BALANCE_ENQUIRY.CREATE": ["AEPS.BALANCE_ENQUIRY"],
  "AEPS.MINI_STATEMENT.CREATE": ["AEPS.MINI_STATEMENT"],
  "AEPS.CASH_WITHDRAWAL.CREATE": ["AEPS.CASH_WITHDRAWAL"],
  "AEPS.AADHAAR_PAY.CREATE": ["AEPS.AADHAAR_PAY"],
  "AEPS.CASH_DEPOSIT.CREATE": ["AEPS.CASH_DEPOSIT"],
  "TRANSACTION.FINANCIAL_RECOVERY": ["TRANSACTION.FINANCIAL-RECOVERY"],
  "TRANSACTION.FINANCIAL-RECOVERY": ["TRANSACTION.FINANCIAL_RECOVERY"],
  "TRANSACTION.PROVIDER-INCOME.VIEW": ["TRANSACTION.PROVIDER_INCOME.VIEW"],
  "TRANSACTION.PROVIDER-INCOME.RECONCILE": ["TRANSACTION.PROVIDER_INCOME.RECONCILE"],
  "TRANSACTION.PROVIDER_INCOME.VIEW": ["TRANSACTION.PROVIDER-INCOME.VIEW", "PROVIDER_INCOME.VIEW"],
  "PROVIDER_INCOME.VIEW": ["TRANSACTION.PROVIDER_INCOME.VIEW", "TRANSACTION.PROVIDER-INCOME.VIEW"],
  "TRANSACTION.PROVIDER_INCOME.RECONCILE": [
    "TRANSACTION.PROVIDER-INCOME.RECONCILE",
    "PROVIDER_INCOME.RECONCILE",
  ],
  "PROVIDER_INCOME.RECONCILE": [
    "TRANSACTION.PROVIDER_INCOME.RECONCILE",
    "TRANSACTION.PROVIDER-INCOME.RECONCILE",
  ],
};

function equivalentPermissionCodes(code: string): readonly string[] {
  const normalized = normalizePermissionCode(code);
  return [normalized, ...(permissionAliases[normalized] || [])];
}

export function permissionEnforcementMode(): "compat" | "strict" {
  return String(import.meta.env.VITE_PERMISSION_ENFORCEMENT || "compat").toLowerCase() === "strict"
    ? "strict"
    : "compat";
}

export function hasAnyPermission(
  access: EffectiveAccess | null | undefined,
  codes: readonly string[],
) {
  if (!access || codes.length === 0) return false;
  const granted = new Set(access.permissionCodes.map(normalizePermissionCode));
  return codes.some((code) =>
    equivalentPermissionCodes(code).some((candidate) => granted.has(candidate)),
  );
}

export function hasAllPermissions(
  access: EffectiveAccess | null | undefined,
  codes: readonly string[],
) {
  if (!access || codes.length === 0) return false;
  const granted = new Set(access.permissionCodes.map(normalizePermissionCode));
  return codes.every((code) =>
    equivalentPermissionCodes(code).some((candidate) => granted.has(candidate)),
  );
}

export function canAccessUiArea(
  area: UiArea,
  options: {
    role?: string | null;
    access?: EffectiveAccess | null;
    dedicatedSuperAdmin?: boolean;
  },
): boolean {
  if (options.dedicatedSuperAdmin) return true;

  const role = normalizeRole(options.role);
  if (!role) return false;

  if (area === "dashboard" || area === "profile" || area === "settings") return true;

  const rule = areaRules[area];
  // AEPS contains regulated biometric and financial actions. Once access is
  // evaluated, it must never fall back to a broad role-based grant.
  if (area === "aeps") {
    if (!options.access) return false;
    if (rule.allOf?.length && !hasAllPermissions(options.access, rule.allOf)) return false;
    return !rule.anyOf?.length || hasAnyPermission(options.access, rule.anyOf);
  }
  if (options.access) {
    if (rule.allOf?.length && !hasAllPermissions(options.access, rule.allOf)) return false;
    if (!rule.anyOf?.length || hasAnyPermission(options.access, rule.anyOf)) return true;
    if (permissionEnforcementMode() === "strict") return false;
    return compatRoleAreas[role].includes(area);
  }

  // During rollout, keep today's role-based UX until packages/permissions are fully seeded.
  // Production should set VITE_PERMISSION_ENFORCEMENT=strict after backend permission setup is complete.
  if (permissionEnforcementMode() === "strict") return false;
  return compatRoleAreas[role].includes(area);
}

export function permissionsForArea(area: UiArea): readonly string[] {
  return areaRules[area].anyOf || areaRules[area].allOf || [];
}

export type PermissionCheckOptions = {
  role?: string | null;
  access?: EffectiveAccess | null;
  dedicatedSuperAdmin?: boolean;
  fallbackRoles?: readonly PlatformRole[];
};

export function canUsePermission(
  codes: string | readonly string[],
  options: PermissionCheckOptions,
): boolean {
  if (options.dedicatedSuperAdmin) return true;
  const requested: readonly string[] = typeof codes === "string" ? [codes] : codes;
  if (!requested.length) return false;
  if (options.access && hasAnyPermission(options.access, requested)) return true;
  if (permissionEnforcementMode() === "strict") return false;
  const role = normalizeRole(options.role);
  return Boolean(role && options.fallbackRoles?.includes(role));
}
