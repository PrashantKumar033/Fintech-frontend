import type { EffectiveAccess } from "@/lib/auth-api";
import { normalizeRole, resolveWorkspaceRole, type PlatformRole } from "@/lib/role-hierarchy";

/**
 * Frontend permission contract.
 *
 * The Auth service stores permission codes in uppercase dot notation.
 * Keep these codes in sync with the backend permission seed/catalog.
 */
export const UI_PERMISSION = {
  ADMIN_DASHBOARD_VIEW: "ADMIN.DASHBOARD.VIEW",
  TRANSACTION_VIEW: "AEPS.TRANSACTION.VIEW",
  TRANSACTION_NETWORK_VIEW: "AEPS.NETWORK_TRANSACTION.VIEW",
  TRANSACTION_ADMIN_LIST: "PROVIDER_TRANSACTION.ADMIN.LIST",
  TRANSACTION_ADMIN_VIEW: "PROVIDER_TRANSACTION.ADMIN.VIEW",
  TRANSACTION_RECONCILIATION_VIEW: "PROVIDER_TRANSACTION.RECONCILIATION.LIST",
  TRANSACTION_RECONCILIATION_RESOLVE: "PROVIDER_TRANSACTION.RECONCILIATION.RESOLVE",
  TRANSACTION_REVERSAL_REQUEST: "PROVIDER_TRANSACTION.REVERSAL.REQUEST",
  TRANSACTION_REVERSAL_LIST: "PROVIDER_TRANSACTION.REVERSAL.LIST",
  TRANSACTION_REVERSAL_VIEW: "PROVIDER_TRANSACTION.REVERSAL.VIEW",
  TRANSACTION_REVERSAL_PROCESS: "PROVIDER_TRANSACTION.REVERSAL.PROCESS",
  TRANSACTION_FINANCIAL_RECOVERY: "PROVIDER_TRANSACTION.FINANCIAL_EFFECTS.RECOVER",
  TRANSACTION_PROVIDER_INCOME_VIEW: "PROVIDER_INCOME.VIEW",
  TRANSACTION_PROVIDER_INCOME_RECONCILE: "PROVIDER_INCOME.RECONCILE",
  TRANSACTION_AEPS_OVERVIEW_VIEW: "TRANSACTION.AEPS_OVERVIEW.VIEW",

  KYC_REVIEW_LIST: "KYC.REVIEW.LIST",
  KYC_REVIEW_VIEW: "KYC.REVIEW.VIEW",
  KYC_REVIEW_DOCUMENT: "KYC.REVIEW.DOCUMENT",
  KYC_REVIEW_VIDEO: "KYC.REVIEW.VIDEO",
  KYC_REVIEW_APPROVE: "KYC.REVIEW.APPROVE",
  KYC_REVIEW_REJECT: "KYC.REVIEW.REJECT",

  WALLET_VIEW: "WALLET.BALANCE.VIEW",
  WALLET_TRANSFER: "WALLET.MAIN.TRANSFER",
  WALLET_AEPS_TO_MAIN_TRANSFER: "WALLET.AEPS_TO_MAIN.TRANSFER",
  WALLET_FUND_REQUEST: "WALLET.FUND_REQUEST",
  WALLET_TRANSACTION_VIEW: "WALLET.TRANSACTION.VIEW",
  WALLET_HOLD_VIEW: "WALLET.HOLD.VIEW",
  WALLET_HOLD_CREATE: "WALLET.HOLD.CREATE",
  WALLET_HOLD_RELEASE: "WALLET.HOLD.RELEASE",
  WALLET_HOLD_SETTLE: "WALLET.HOLD.SETTLE",
  WALLET_DIRECT_DEDUCT: "WALLET.DEDUCT",

  PAYOUT_SETTLEMENT_CREATE: "PAYOUT.SETTLEMENT.CREATE",
  PAYOUT_SETTLEMENT_VIEW_SELF: "PAYOUT.SETTLEMENT.VIEW_SELF",
  PAYOUT_SETTLEMENT_VIEW_ALL: "PAYOUT.SETTLEMENT.VIEW_ALL",
  PAYOUT_RECONCILIATION_VIEW: "PAYOUT.RECONCILIATION.VIEW",
  PAYOUT_RECONCILIATION_RESOLVE: "PAYOUT.RECONCILIATION.RESOLVE",
  PAYOUT_SERVICE_STATUS_VIEW: "PAYOUT.SERVICE.STATUS.VIEW",
  PAYOUT_SERVICE_STATUS_UPDATE: "PAYOUT.SERVICE.STATUS.UPDATE",
  PAYOUT_PROVIDER_VIEW: "PAYOUT.PROVIDER.VIEW",
  PAYOUT_PROVIDER_STATUS_UPDATE: "PAYOUT.PROVIDER.STATUS.UPDATE",
  PAYOUT_PROVIDER_HEALTH_VIEW: "PAYOUT.PROVIDER.HEALTH.VIEW",
  PAYOUT_SURCHARGE_VIEW: "PAYOUT.SURCHARGE.VIEW",
  PAYOUT_SURCHARGE_UPDATE: "PAYOUT.SURCHARGE.UPDATE",
  PAYOUT_MASTER_DATA_VIEW: "PAYOUT.MASTER_DATA.VIEW",

  AEPS_VIEW: "AEPS.ONBOARDING.STATUS.VIEW",
  AEPS_BANKS_VIEW: "AEPS.MASTER_DATA.VIEW",
  AEPS_STATES_VIEW: "AEPS.MASTER_DATA.VIEW",
  AEPS_DISTRICTS_VIEW: "AEPS.MASTER_DATA.VIEW",
  AEPS_BANK_IINS_VIEW: "AEPS.MASTER_DATA.VIEW",
  AEPS_ONBOARDING: "AEPS.ONBOARDING.REGISTER",
  AEPS_BALANCE_ENQUIRY: "AEPS.BALANCE_ENQUIRY.CREATE",
  AEPS_MINI_STATEMENT: "AEPS.MINI_STATEMENT.CREATE",
  AEPS_CASH_WITHDRAWAL: "AEPS.CASH_WITHDRAWAL.CREATE",
  AEPS_AADHAAR_PAY: "AEPS.AADHAAR_PAY.CREATE",
  AEPS_CASH_DEPOSIT: "AEPS.CASH_DEPOSIT.CREATE",
  AEPS_TWO_FACTOR_CREATE: "AEPS.TWO_FACTOR.CREATE",
  AEPS_TRANSACTION_VIEW: "AEPS.TRANSACTION.VIEW",
  AEPS_NETWORK_TRANSACTION_VIEW: "AEPS.NETWORK_TRANSACTION.VIEW",
  AEPS_PROVIDER_VIEW: "AEPS.PROVIDER.VIEW",
  AEPS_PROVIDER_HEALTH_VIEW: "AEPS.PROVIDER.HEALTH.VIEW",
  AEPS_SERVICE_STATUS_VIEW: "AEPS.SERVICE.STATUS.VIEW",
  AEPS_SERVICE_STATUS_UPDATE: "AEPS.SERVICE.STATUS.UPDATE",

  ACCOUNT_CREATE: "ACCOUNT.CREATE",
  MEMBER_LIST: "MEMBER.LIST",
  MEMBER_VIEW: "MEMBER.VIEW",
  MEMBER_STATUS_UPDATE: "MEMBER.STATUS.UPDATE",
  BANK_ACCOUNT_LIST: "BANK_ACCOUNT.LIST",
  BANK_ACCOUNT_VIEW: "BANK_ACCOUNT.VIEW",
  BANK_ACCOUNT_REVIEW: "BANK_ACCOUNT.REVIEW",
  PROVIDER_INCOME_VIEW: "PROVIDER_INCOME.VIEW",
  PROVIDER_INCOME_RECONCILE: "PROVIDER_INCOME.RECONCILE",
  AEPS_MERCHANT_STATUS_UPDATE: "AEPS.MERCHANT.STATUS.UPDATE",
  WALLET_LEDGER_VIEW: "WALLET.LEDGER.VIEW",
  AEPS_PROVIDER_STATUS_VIEW: "AEPS.PROVIDER.STATUS.VIEW",
  AEPS_PROVIDER_SERVICE_STATUS_UPDATE: "AEPS.PROVIDER.SERVICE.STATUS.UPDATE",

  FUND_REQUEST_ADMIN_LIST: "FUND_REQUEST.ADMIN.LIST",
  FUND_REQUEST_ADMIN_VIEW: "FUND_REQUEST.ADMIN.VIEW",
  FUND_REQUEST_ADMIN_APPROVE: "FUND_REQUEST.ADMIN.APPROVE",
  FUND_REQUEST_ADMIN_REJECT: "FUND_REQUEST.ADMIN.REJECT",
  FUND_REQUEST_ADMIN_REINITIATE: "FUND_REQUEST.ADMIN.REINITIATE",

  COMMISSION_RULE_VIEW: "COMMISSION.RULE.VIEW",
  COMMISSION_RULE_LIST: "COMMISSION.RULE.LIST",
  COMMISSION_RULE_CREATE: "COMMISSION.RULE.CREATE",
  COMMISSION_RULE_UPDATE: "COMMISSION.RULE.UPDATE",
  COMMISSION_RULE_DEACTIVATE: "COMMISSION.RULE.DELETE",
  COMMISSION_DISTRIBUTION_VIEW: "COMMISSION.DISTRIBUTION.VIEW",
  COMMISSION_DISTRIBUTION_LIST: "COMMISSION.DISTRIBUTION.LIST",
  COMMISSION_DISTRIBUTION_CREATE: "COMMISSION.DISTRIBUTION.CREATE",
  COMMISSION_DISTRIBUTION_UPDATE: "COMMISSION.DISTRIBUTION.UPDATE",
  COMMISSION_DISTRIBUTION_DEACTIVATE: "COMMISSION.DISTRIBUTION.DELETE",
  COMMISSION_HIERARCHY_VIEW: "COMMISSION.HIERARCHY.VIEW",
  COMMISSION_HIERARCHY_CREATE: "COMMISSION.HIERARCHY.CREATE",
  COMMISSION_HIERARCHY_UPDATE: "COMMISSION.HIERARCHY.UPDATE",
  COMMISSION_HIERARCHY_DELETE: "COMMISSION.HIERARCHY.DELETE",

  ROLE_VIEW: "ROLE.VIEW",
  ROLE_LIST: "ROLE.LIST",
  PERMISSION_VIEW: "PERMISSION.VIEW",
  PERMISSION_LIST: "PERMISSION.LIST",
  PACKAGE_VIEW: "PACKAGE.VIEW",
  PACKAGE_LIST: "PACKAGE.LIST",
  PACKAGE_PERMISSION_LIST: "PACKAGE.PERMISSION.LIST",
  ROLE_PACKAGE_LIST: "ROLE.PACKAGE.LIST",
  ROLE_EFFECTIVE_PERMISSION_VIEW: "ROLE.EFFECTIVE_PERMISSION.VIEW",

  AUDIT_ALL_LIST: "AUDIT.ALL.LIST",
} as const;

export type UiArea =
  | "dashboard"
  | "profile"
  | "members"
  | "transactions"
  | "bankAccounts"
  | "banking"
  | "kycSelf"
  | "kyc"
  | "aeps"
  | "wallet"
  | "earnings"
  | "commissions"
  | "settlements"
  | "access"
  | "reports"
  | "activity"
  | "api"
  | "settings"
  | "legal"
  | "support"
  | "sms";

type AreaRule = {
  /** Authenticated pages whose backend endpoints do not require a permission. */
  authenticated?: boolean;
  anyOf?: readonly string[];
  allOf?: readonly string[];
};

const areaRules: Record<UiArea, AreaRule> = {
  dashboard: { authenticated: true },
  profile: { authenticated: true },
  settings: { authenticated: true },
  bankAccounts: { authenticated: true },
  kycSelf: { authenticated: true },
  activity: { authenticated: true },
  legal: { authenticated: true },
  support: { authenticated: true },
  sms: { authenticated: true },
  members: {
    anyOf: [
      UI_PERMISSION.MEMBER_LIST,
      UI_PERMISSION.MEMBER_VIEW,
      UI_PERMISSION.MEMBER_STATUS_UPDATE,
      UI_PERMISSION.ACCOUNT_CREATE,
    ],
  },
  transactions: {
    anyOf: [
      UI_PERMISSION.TRANSACTION_VIEW,
      UI_PERMISSION.TRANSACTION_NETWORK_VIEW,
      UI_PERMISSION.TRANSACTION_ADMIN_LIST,
      UI_PERMISSION.TRANSACTION_ADMIN_VIEW,
      UI_PERMISSION.TRANSACTION_RECONCILIATION_VIEW,
      UI_PERMISSION.TRANSACTION_REVERSAL_LIST,
      UI_PERMISSION.TRANSACTION_REVERSAL_VIEW,
      UI_PERMISSION.TRANSACTION_PROVIDER_INCOME_VIEW,
    ],
  },
  banking: {
    anyOf: [
      UI_PERMISSION.BANK_ACCOUNT_LIST,
      UI_PERMISSION.BANK_ACCOUNT_VIEW,
      UI_PERMISSION.BANK_ACCOUNT_REVIEW,
    ],
  },
  kyc: {
    anyOf: [
      UI_PERMISSION.KYC_REVIEW_LIST,
      UI_PERMISSION.KYC_REVIEW_VIEW,
      UI_PERMISSION.KYC_REVIEW_DOCUMENT,
      UI_PERMISSION.KYC_REVIEW_VIDEO,
      UI_PERMISSION.KYC_REVIEW_APPROVE,
      UI_PERMISSION.KYC_REVIEW_REJECT,
    ],
  },
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
      UI_PERMISSION.AEPS_TRANSACTION_VIEW,
      UI_PERMISSION.AEPS_NETWORK_TRANSACTION_VIEW,
      UI_PERMISSION.AEPS_PROVIDER_VIEW,
      UI_PERMISSION.AEPS_PROVIDER_HEALTH_VIEW,
      UI_PERMISSION.AEPS_SERVICE_STATUS_VIEW,
      UI_PERMISSION.AEPS_SERVICE_STATUS_UPDATE,
      UI_PERMISSION.AEPS_MERCHANT_STATUS_UPDATE,
      UI_PERMISSION.AEPS_PROVIDER_STATUS_VIEW,
      UI_PERMISSION.AEPS_PROVIDER_SERVICE_STATUS_UPDATE,
      UI_PERMISSION.TRANSACTION_AEPS_OVERVIEW_VIEW,
    ],
  },
  wallet: {
    anyOf: [
      UI_PERMISSION.WALLET_VIEW,
      UI_PERMISSION.WALLET_TRANSFER,
      UI_PERMISSION.WALLET_LEDGER_VIEW,
      UI_PERMISSION.WALLET_FUND_REQUEST,
      UI_PERMISSION.WALLET_TRANSACTION_VIEW,
      UI_PERMISSION.WALLET_AEPS_TO_MAIN_TRANSFER,
      UI_PERMISSION.WALLET_HOLD_VIEW,
      UI_PERMISSION.PAYOUT_SETTLEMENT_CREATE,
      UI_PERMISSION.PAYOUT_SETTLEMENT_VIEW_SELF,
    ],
  },
  earnings: {
    anyOf: [UI_PERMISSION.WALLET_TRANSACTION_VIEW, UI_PERMISSION.WALLET_VIEW],
  },
  commissions: {
    anyOf: [
      UI_PERMISSION.COMMISSION_RULE_LIST,
      UI_PERMISSION.COMMISSION_RULE_VIEW,
      UI_PERMISSION.COMMISSION_DISTRIBUTION_LIST,
      UI_PERMISSION.COMMISSION_DISTRIBUTION_VIEW,
      UI_PERMISSION.COMMISSION_HIERARCHY_VIEW,
    ],
  },
  settlements: {
    anyOf: [
      UI_PERMISSION.WALLET_VIEW,
      UI_PERMISSION.WALLET_LEDGER_VIEW,
      UI_PERMISSION.WALLET_HOLD_VIEW,
      UI_PERMISSION.FUND_REQUEST_ADMIN_LIST,
      UI_PERMISSION.FUND_REQUEST_ADMIN_VIEW,
    ],
  },
  access: {
    anyOf: [
      UI_PERMISSION.ROLE_VIEW,
      UI_PERMISSION.ROLE_LIST,
      UI_PERMISSION.PERMISSION_VIEW,
      UI_PERMISSION.PERMISSION_LIST,
      UI_PERMISSION.PACKAGE_VIEW,
      UI_PERMISSION.PACKAGE_LIST,
      UI_PERMISSION.PACKAGE_PERMISSION_LIST,
      UI_PERMISSION.ROLE_PACKAGE_LIST,
      UI_PERMISSION.ROLE_EFFECTIVE_PERMISSION_VIEW,
    ],
  },
  reports: {
    anyOf: [
      UI_PERMISSION.WALLET_TRANSACTION_VIEW,
      UI_PERMISSION.WALLET_LEDGER_VIEW,
      UI_PERMISSION.AUDIT_ALL_LIST,
    ],
  },
  api: {
    anyOf: [
      UI_PERMISSION.AEPS_PROVIDER_STATUS_VIEW,
      UI_PERMISSION.AEPS_PROVIDER_SERVICE_STATUS_UPDATE,
      UI_PERMISSION.AEPS_PROVIDER_VIEW,
      UI_PERMISSION.AEPS_PROVIDER_HEALTH_VIEW,
      UI_PERMISSION.AEPS_SERVICE_STATUS_VIEW,
      UI_PERMISSION.AEPS_SERVICE_STATUS_UPDATE,
      UI_PERMISSION.PAYOUT_SERVICE_STATUS_VIEW,
      UI_PERMISSION.PAYOUT_SERVICE_STATUS_UPDATE,
      UI_PERMISSION.PAYOUT_PROVIDER_VIEW,
      UI_PERMISSION.PAYOUT_PROVIDER_STATUS_UPDATE,
      UI_PERMISSION.PAYOUT_PROVIDER_HEALTH_VIEW,
      UI_PERMISSION.PAYOUT_SURCHARGE_VIEW,
      UI_PERMISSION.PAYOUT_SURCHARGE_UPDATE,
    ],
  },
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
    "access",
    "reports",
    "api",
    "settings",
    "legal",
    "support",
    "sms",
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
  "WALLET.BALANCE.VIEW": ["WALLET.VIEW"],
  "WALLET.MAIN.TRANSFER": ["WALLET.TRANSFER"],
  "AEPS.ONBOARDING.STATUS.VIEW": ["AEPS.VIMOPAY.STATUS.VIEW", "AEPS.VIEW"],
  "AEPS.MASTER_DATA.VIEW": [
    "AEPS.VIMOPAY.BANKS.VIEW",
    "AEPS.VIMOPAY.DISTRICTS.VIEW",
    "AEPS.VIMOPAY.BANK_IINS.VIEW",
  ],
  "AEPS.ONBOARDING.REGISTER": ["AEPS.VIMOPAY.ONBOARDING.REGISTER", "AEPS.ONBOARDING"],
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

  const exactRole = normalizeRole(options.role);
  const role = resolveWorkspaceRole(options.role, options.access || undefined);
  if (!role) return false;

  const rule = areaRules[area];
  if (rule.authenticated) return true;
  // AEPS contains regulated biometric and financial actions. Once access is
  // evaluated, it must never fall back to a broad role-based grant.
  if (area === "aeps") {
    if (!options.access) return false;
    if (rule.allOf?.length && !hasAllPermissions(options.access, rule.allOf)) return false;
    return !rule.anyOf?.length || hasAnyPermission(options.access, rule.anyOf);
  }
  // The global audit endpoint is additionally protected by the backend's
  // Super Admin guard. Financial reports remain available to identities with
  // wallet-ledger permissions, but an ADMIN must not gain the Reports route
  // from AUDIT.ALL.LIST alone.
  if (area === "reports" && options.access) {
    const canReadFinancialReport = hasAnyPermission(options.access, [
      UI_PERMISSION.WALLET_TRANSACTION_VIEW,
      UI_PERMISSION.WALLET_LEDGER_VIEW,
    ]);
    const canReadGlobalAudit =
      role === "SUPER_ADMIN" && hasAnyPermission(options.access, [UI_PERMISSION.AUDIT_ALL_LIST]);
    if (canReadFinancialReport || canReadGlobalAudit) return true;
    if (permissionEnforcementMode() === "strict" || !exactRole) return false;
    return compatRoleAreas[role].includes(area);
  }
  if (options.access) {
    if (rule.allOf?.length && !hasAllPermissions(options.access, rule.allOf)) return false;
    if (!rule.anyOf?.length || hasAnyPermission(options.access, rule.anyOf)) return true;
    if (permissionEnforcementMode() === "strict" || !exactRole) return false;
    return compatRoleAreas[role].includes(area);
  }

  // During rollout, keep today's role-based UX until packages/permissions are fully seeded.
  // Production should set VITE_PERMISSION_ENFORCEMENT=strict after backend permission setup is complete.
  if (permissionEnforcementMode() === "strict" || !exactRole) return false;
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
  const exactRole = normalizeRole(options.role);
  return Boolean(exactRole && options.fallbackRoles?.includes(exactRole));
}

export function canUseAllPermissions(
  codes: readonly string[],
  options: PermissionCheckOptions,
): boolean {
  if (options.dedicatedSuperAdmin) return true;
  if (!codes.length) return false;
  if (options.access && hasAllPermissions(options.access, codes)) return true;
  if (permissionEnforcementMode() === "strict") return false;
  const exactRole = normalizeRole(options.role);
  return Boolean(exactRole && options.fallbackRoles?.includes(exactRole));
}
