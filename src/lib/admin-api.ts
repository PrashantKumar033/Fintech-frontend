import {
  clearSession,
  getSession,
  logout as identityLogout,
  refreshSession,
  type ActiveSession,
} from "@/lib/auth-api";
import { getDeviceId } from "@/lib/device-id";
import type { ProviderTransaction } from "@/lib/operations-api";
import {
  buildFinancialRecoveryPath,
  financialRecoveryRequestInit,
} from "@/lib/provider-transaction-ui";
import type {
  PayoutPage,
  PayoutPaymentMode,
  PayoutSettlementDetail,
  PayoutSettlementStatus,
  PayoutSourceWallet,
} from "@/lib/payout-api";

const defaultUrl =
  typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : "http://localhost:8000";
const API_URL = (import.meta.env.VITE_API_URL || defaultUrl).replace(/\/$/, "");
const TOKEN_KEY = "nexus_super_admin_access_token";
const SESSION_KEY = "nexus_super_admin_session";

export type AdminSession = {
  accessToken: string;
  onboardingRequired: boolean;
  onboardingStatus?: string;
  nextStep?: string;
  superAdmin?: { id?: string; loginId?: string; fullName?: string; email?: string; role?: string };
};
export type AdminDeviceVerificationChallenge = {
  requiresDeviceVerification: true;
  challengeId: string;
  maskedEmail: string;
  expiresAt: string;
  message: string;
};
export type AdminLoginResult = AdminSession | AdminDeviceVerificationChallenge;
export function adminRequiresDeviceVerification(
  result: AdminLoginResult,
): result is AdminDeviceVerificationChallenge {
  return "requiresDeviceVerification" in result && result.requiresDeviceVerification === true;
}
export type AdminEntity = {
  id: string;
  name: string;
  code?: string;
  prefix?: string;
  authorityLevel?: number;
  description?: string;
  price?: string;
  isActive: boolean;
  createdAt?: string;
};
export type PackagePermissionAssignment = {
  packageId: string;
  permissionId: string;
  permission: AdminEntity;
};
export type RolePackageAssignment = { roleId: string; packageId: string; package: AdminEntity };
export type RoleRegisterPermission = {
  registrarRoleId: string;
  targetRoleId: string;
  isActive: boolean;
  targetRole: AdminEntity;
};
export type RoleEffectiveAccess = {
  role: { id: string; name: string; authorityLevel: number; isActive: boolean };
  packages: Array<{ id: string; code: string; name: string }>;
  permissions: Array<{ id: string; code: string; name: string; description?: string | null }>;
  permissionCodes: string[];
};
export type AuditLog = {
  id: string;
  eventId?: string;
  identityId?: string | null;
  loginId?: string | null;
  role?: string | null;
  service?: string;
  action?: string;
  status?: "SUCCESS" | "FAILED" | string;
  ipAddress?: string | null;
  userAgent?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  errorMessage?: string | null;
  httpMethod?: string | null;
  endpoint?: string | null;
  statusCode?: number | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
};
export type AuditPage = {
  data: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
};
export type TransactionDetail = Record<string, unknown> & {
  id?: string;
  referenceId?: string;
  userId?: string;
  serviceType?: string;
  provider?: string;
  operation?: string;
  amount?: string | number;
  status?: string;
  statusDescription?: string | null;
  npciMessage?: string | null;
  providerStatusMessage?: string | null;
  reconciliationReason?: string | null;
  needsReconciliation?: boolean;
  settlementStatus?: string | null;
  commissionStatus?: string | null;
  rrn?: string | null;
  providerTxnRefId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};
export type AdminProviderTransaction = ProviderTransaction & {
  userId: string;
  userLoginId?: string | null;
  userDisplayName?: string | null;
  userRole?: string | null;
  sourceRole?: string | null;
  merchantRefId?: string | null;
  reversedAt?: string | null;
};
export type AdminProviderTransactionPage = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  data: AdminProviderTransaction[];
};
export type CommissionHierarchy = {
  id: string;
  parentUserId: string;
  parentRole: string;
  childUserId: string;
  childRole: string;
  serviceType?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};
export type ReconciliationStatus = "PENDING" | "UNKNOWN";
export type ReconciliationResolution = "SUCCESS" | "FAILED";
export type ReconciliationItem = {
  referenceId: string;
  userId?: string;
  serviceType?: string;
  provider?: string;
  operation?: string;
  amount?: string | number;
  status?: ReconciliationStatus | string;
  statusDescription?: string | null;
  providerMerchantRefId?: string | null;
  providerTxnRefId?: string | null;
  rrn?: string | null;
  npciCode?: string | null;
  npciMessage?: string | null;
  providerStatusCode?: string | null;
  providerStatusMessage?: string | null;
  bankIIN?: string | null;
  aadhaarLast4?: string | null;
  needsReconciliation?: boolean;
  reconciliationReason?: string | null;
  providerCalledAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};
export type ReconciliationPage = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  data: ReconciliationItem[];
};
export type ResolveTransactionInput = {
  resolution: ReconciliationResolution;
  note?: string;
  providerTxnRefId?: string;
  rrn?: string;
  npciCode?: string;
  npciMessage?: string;
};
export type ResolveTransactionResult = Record<string, unknown> & {
  referenceId?: string;
  status?: string;
  needsReconciliation?: boolean;
  reconciledAt?: string | null;
  statusDescription?: string | null;
  nextAction?: "RECOVER_FINANCIAL_EFFECTS" | "NONE" | string;
};
export type RecoverFinancialEffectsResult = {
  transaction: {
    referenceId: string;
    status: string;
    operation?: string;
    amount?: string | number;
    needsReconciliation: boolean;
    statusDescription?: string | null;
  };
  settlement: {
    status?: string | null;
    transactionReference?: string | null;
    compensationTransactionReference?: string | null;
  };
  commission: {
    status?: string | null;
    reason?: string | null;
  };
  walletTransaction?: Record<string, unknown> | null;
  recoveryComplete: boolean;
  duplicate?: boolean;
};
export type ReversalRequestResult = Record<string, unknown> & {
  id?: string;
  referenceId?: string;
  providerTransactionId?: string;
  amount?: string | number;
  status?: string;
  reason?: string;
  requestedBy?: string;
  createdAt?: string;
  originalTransactionReference?: string;
  originalTransactionStatus?: string;
  nextAction?: string;
  duplicate?: boolean;
};
export type ProviderIncomeInput = {
  providerIncomeAmount?: number;
  incomeSource?: "PROVIDER_WALLET" | "PROVIDER_MS";
  externalReference?: string;
};
export type ProviderReversal = {
  referenceId: string;
  providerTransactionReference: string;
  provider: string;
  operation: string;
  userId: string;
  amount: string | number;
  status: "REQUESTED" | "PROCESSING" | "COMPLETED" | "FAILED" | string;
  principalStatus?: string;
  commissionStatus?: string;
  reason?: string;
  requestedBy?: string;
  processedBy?: string | null;
  failedReason?: string | null;
  createdAt?: string;
  completedAt?: string | null;
};
export type ProviderReversalPage = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  data: ProviderReversal[];
};
export type ProviderReversalDetail = {
  id?: string;
  referenceId: string;
  providerTransactionId?: string;
  idempotencyKey?: string;
  amount: string | number;
  status: "REQUESTED" | "PROCESSING" | "COMPLETED" | "FAILED" | "UNKNOWN" | string;
  reason?: string;
  requestedBy?: string;
  compensationReferenceId?: string | null;
  processingAt?: string | null;
  completedAt?: string | null;
  failedReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
  principalStatus?: string;
  principalCompensationReference?: string | null;
  principalFailureReason?: string | null;
  commissionStatus?: string;
  commissionReversalReference?: string | null;
  commissionFailureReason?: string | null;
  processedBy?: string | null;
  providerTransaction?: ProviderTransaction;
};

export type KycReviewAccountType = "IDENTITY" | "SUPER_ADMIN";
export type KycReviewStatus = "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";
export type KycReviewListItem = {
  id: string;
  identityId: string;
  accountType: KycReviewAccountType;
  status: KycReviewStatus;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { documents?: number };
  video?: { id: string; status: string } | null;
};
export type KycReviewDocument = {
  id: string;
  documentType: string;
  documentNumber?: string | null;
  status: string;
  verificationStatus?: string | null;
  source?: string | null;
  rejectionReason?: string | null;
  previewUrl?: string | null;
};
export type KycReviewDetail = KycReviewListItem & {
  documents: KycReviewDocument[];
  video?: {
    id: string;
    status: string;
    rejectionReason?: string | null;
    previewUrl?: string | null;
  } | null;
};
export type KycReviewPage = {
  data: KycReviewListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
};

export type AdminDashboardSummary = {
  members: { total: number; active: number; suspended: number; blocked: number };
  kyc: { approved: number; rejected: number; notStarted: number; pendingOrInProgress: number };
  aeps: { active: number; blocked: number; notStarted: number; other: number };
  bankAccounts: { total: number; active: number; pending: number; verified: number };
  degradedServices?: Array<"auth" | "kyc" | "aeps" | "bank">;
  generatedAt: string;
};

export type AdminWalletBalances = {
  userId: string;
  wallets: {
    main: number;
    mainHeld: number;
    mainAvailable: number;
    aeps: number;
    profit: number;
  };
};

export type AdminMember = {
  id: string;
  loginId: string;
  fullName: string;
  username: string;
  email: string;
  phoneNumber?: string | null;
  status: string;
  city?: string;
  state?: string;
  pincode?: string;
  shopName?: string | null;
  shopCity?: string | null;
  shopState?: string | null;
  onboardingStatus?: string;
  lastLoginAt?: string | null;
  createdAt?: string;
  role: { id: string; name: string; authorityLevel?: number; isActive?: boolean };
  kycStatus: string;
  aeps: {
    provider: string;
    providerMerchantId?: string | null;
    status: string;
    serviceActivated?: boolean;
    statusReason?: string | null;
  };
};

export type AdminMemberPage = {
  data: AdminMember[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export type AdminMemberDetail = {
  identity: AdminMember & Record<string, unknown>;
  kyc?: Record<string, unknown> | null;
  bankAccounts?: AdminBankAccount[] | null;
  aeps?: Record<string, unknown> | null;
  wallets?: {
    userId?: string;
    wallets?: { main?: number; aeps?: number; profit?: number };
  } | null;
  partialErrors?: string[];
};

export type AdminWalletLedgerEntry = {
  id: string;
  referenceId: string;
  walletType: string;
  serviceType: string;
  type: string;
  amount: string;
  openingBalance: string;
  closingBalance: string;
  status: string;
  description?: string | null;
  externalReference?: string | null;
  sequence: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminWalletLedgerPage = {
  identityId: string;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  data: AdminWalletLedgerEntry[];
};

export type AdminAepsProviderService = {
  operation: string;
  name: string;
  isEnabled: boolean;
  reason?: string | null;
  updatedBy?: string | null;
  updatedAt?: string | null;
};

export type AdminAepsProviderStatus = {
  providers: Array<{
    provider: string;
    status: "ENABLED" | "PARTIALLY_DISABLED" | "DISABLED";
    enabledServices: number;
    totalServices: number;
    services: AdminAepsProviderService[];
  }>;
  generatedAt: string;
};

export type AdminBankAccount = {
  id: string;
  identityId: string;
  bankName: string;
  bankCode?: string | null;
  ifsc: string;
  branchName?: string | null;
  accountHolderName: string;
  accountNumberLast4: string;
  accountType: string;
  purposes: string[];
  status: string;
  verificationStatus: string;
  ownershipStatus: string;
  adminReviewStatus: "PENDING" | "APPROVED" | "REJECTED";
  adminReviewReason?: string | null;
  adminReviewedAt?: string | null;
  verifiedAt?: string | null;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminBankAccountDetail = AdminBankAccount & {
  passbook?: {
    originalName: string;
    mimeType: string;
    url: string;
    expiresInSeconds: number;
  } | null;
  userBankStatusAudits?: Array<Record<string, unknown>>;
  bankAccountVerifications?: Array<Record<string, unknown>>;
};

export type AdminBankAccountPage = {
  data: AdminBankAccount[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export type AdminFundReceivingBank = {
  id: string;
  displayName?: string | null;
  bankName: string;
  ifsc: string;
  branchName?: string | null;
  accountHolderName: string;
  accountNumberLast4: string;
  maskedAccountNumber: string;
  accountType: "SAVINGS" | "CURRENT" | "SALARY";
  upiId?: string | null;
  status: "ACTIVE" | "INACTIVE";
  isDefault: boolean;
  displayOrder: number;
};

export type AdminFundRequest = {
  id: string;
  referenceId: string;
  retailerUserId: string;
  userLoginId?: string | null;
  userDisplayName?: string | null;
  userRole?: string | null;
  amount: string;
  paymentMode: string;
  paymentReference?: string | null;
  paymentDate: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "REINITIATE" | "CANCELLED";
  remark?: string | null;
  adminRemark?: string | null;
  createdAt: string;
};

export type AdminFundHold = {
  id: string;
  referenceId: string;
  targetUserId: string;
  walletType: "MAIN";
  amount: string;
  reason: string;
  status: "ACTIVE" | "SETTLED" | "RELEASED" | "CANCELLED" | "EXPIRED";
  resolutionReason?: string | null;
  releasedAt?: string | null;
  createdAt: string;
};

export type AdminFundHoldPage = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  data?: AdminFundHold[];
  items?: AdminFundHold[];
};

export type ReconciliationAction =
  "RECONCILE_DEBIT" | "CONFIRM_PROVIDER_SUCCESS" | "CONFIRM_PROVIDER_FAILED" | "RETRY_REVERSAL";

export type ProviderRegistryEntry = {
  id?: string;
  publicCode: string;
  internalCode?: string;
  publicName: string;
  displayName?: string | null;
  serviceType: string;
  isActive: boolean;
  metadata?: Record<string, unknown> | null;
  updatedBy?: string | null;
  updatedAt?: string | null;
};

export type ServiceControlStatus = {
  serviceType: string;
  isEnabled: boolean;
  disabledReason?: string | null;
  updatedBy?: string | null;
  updatedAt?: string | null;
};

export type PayoutSurchargeConfiguration = {
  sourceWallet: PayoutSourceWallet;
  type: "PERCENTAGE" | "FIXED";
  surchargeValue: string;
  version: number;
  isActive: boolean;
  updatedBy?: string | null;
  updatedAt: string;
};

export type AdminPayoutSettlement = PayoutSettlementDetail & {
  identityId: string;
};

export type AdminPayoutSettlementPage = PayoutPage<AdminPayoutSettlement>;

export type AdminPayoutSettlementFilters = {
  page?: number;
  limit?: number;
  status?: PayoutSettlementStatus | "";
  identityId?: string;
  paymentMode?: PayoutPaymentMode | "";
  providerCode?: string;
  fromDate?: string;
  toDate?: string;
};

export type AdminPayoutOverviewRange =
  | "LAST_30_MINUTES"
  | "LAST_1_HOUR"
  | "LAST_2_HOURS"
  | "LAST_4_HOURS"
  | "LAST_6_HOURS"
  | "LAST_10_HOURS"
  | "LAST_24_HOURS"
  | "CUSTOM";

export type AdminPayoutOverviewFilters = {
  range?: AdminPayoutOverviewRange;
  fromDate?: string;
  toDate?: string;
  identityId?: string;
  providerCode?: string;
  paymentMode?: PayoutPaymentMode | "";
  sourceWallet?: PayoutSourceWallet | "";
};

export type AdminPayoutOverviewBreakdown = {
  total: number;
  successful: number;
  failed: number;
  pending: number;
  volume: string;
  successfulVolume: string;
};

export type AdminPayoutOverview = {
  generatedAt: string;
  range: {
    fromDate: string;
    toDate: string;
    mode: AdminPayoutOverviewRange;
  };
  filters: {
    identityId: string | null;
    providerCode: string | null;
    paymentMode: PayoutPaymentMode | null;
    sourceWallet: PayoutSourceWallet | null;
  };
  totals: {
    transactions: number;
    requestedVolume: string;
    successfulVolume: string;
    failedVolume: string;
    pendingVolume: string;
    totalWalletDebit: string;
    successfulWalletDebit: string;
    totalSurcharge: string;
    successfulSurcharge: string;
    successfulRetailerNetCommission: string;
    successfulAdminNetIncome: string;
    averageTicket: string;
    successRate: number;
    reconciliationRequired: number;
  };
  statuses: Record<string, number>;
  walletStates: Record<string, number>;
  providers: Array<AdminPayoutOverviewBreakdown & { providerCode: string }>;
  paymentModes: Array<AdminPayoutOverviewBreakdown & { paymentMode: PayoutPaymentMode }>;
  sourceWallets: Array<AdminPayoutOverviewBreakdown & { sourceWallet: PayoutSourceWallet }>;
};

export type AdminPayoutReconciliation = AdminPayoutSettlement & {
  reconciliation: {
    reason: string;
    recoveryAttemptCount: number;
    providerSubmissionStartedAt: string | null;
  };
};

export type AdminPayoutReconciliationPage = PayoutPage<AdminPayoutReconciliation>;

export type ResolvePayoutReconciliationInput = {
  resolution: "SUCCESS" | "FAILED";
  reason: string;
  evidenceReference: string;
  providerTxnId?: string;
  rrn?: string;
  providerStatusCode?: string;
  providerStatusMessage?: string;
};

export type AepsOverviewBreakdown = {
  total: number;
  successful: number;
  failed: number;
  pending: number;
  volume: string | number;
  successfulVolume: string | number;
};

export type AepsOverviewRange =
  | "LAST_30_MINUTES"
  | "LAST_1_HOUR"
  | "LAST_2_HOURS"
  | "LAST_4_HOURS"
  | "LAST_6_HOURS"
  | "LAST_10_HOURS"
  | "LAST_12_HOURS"
  | "LAST_24_HOURS"
  | "CUSTOM";

export type AepsOverviewFilters = {
  provider?: string;
  operation?: "BE" | "MS" | "CW" | "AP" | "CD" | "";
  range?: AepsOverviewRange;
  fromDate?: string;
  toDate?: string;
};

export type AepsOverviewMetrics = {
  generatedAt: string;
  range: {
    fromDate: string;
    toDate: string;
    mode: AepsOverviewRange;
  };
  filters: {
    provider: string | null;
    operation: string | null;
  };
  totals: {
    transactions: number;
    financialTransactions: number;
    nonFinancialTransactions: number;
    financialVolume: string | number;
    successfulFinancialVolume: string | number;
    averageFinancialTicket: string | number;
    successRate: number;
    financialSuccessRate: number;
    reconciliationRequired: number;
  };
  statuses: Record<string, number>;
  settlement: Record<string, number>;
  commission: Record<string, string | number> & { settledAmount: string | number };
  operations: Array<AepsOverviewBreakdown & { operation: string }>;
  providers: Array<AepsOverviewBreakdown & { provider: string }>;
};

export type AepsTwoFactorFeeConfiguration = {
  provider: string;
  configured: boolean;
  feeAmount: string | number;
  version: number;
  updatedByIdentityId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type AepsTwoFactorReconciliationItem = {
  id: string;
  status: string;
  feeAmount?: string | number | null;
  providerMerchantRefId?: string | null;
  providerTxnRefId?: string | null;
  providerStatusCode?: string | null;
  providerStatusMessage?: string | null;
  debitReferenceId?: string | null;
  reversalReferenceId?: string | null;
  failureCode?: string | null;
  failureReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
  day?: {
    businessDate?: string;
    status?: string;
    profile?: {
      identityId?: string;
      provider?: string;
      providerMerchantId?: string | null;
    };
  } | null;
};

export type AepsTwoFactorReconciliationPage = {
  items: AepsTwoFactorReconciliationItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type BankVerificationReconciliationItem = {
  id: string;
  identityId?: string | null;
  provider: string;
  clientRefId: string;
  status: string;
  accountNumberLast4?: string | null;
  ifsc?: string | null;
  accountHolderName?: string | null;
  feeAmount?: string | number | null;
  feeStatus?: string | null;
  debitReferenceId?: string | null;
  reversalReferenceId?: string | null;
  providerTxnId?: string | null;
  providerStatusCode?: string | null;
  providerStatusMessage?: string | null;
  failureCode?: string | null;
  failureReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type BankVerificationReconciliationPage = {
  items: BankVerificationReconciliationItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type CommissionRuleType = "FIXED" | "PERCENTAGE";
export type CommissionRule = {
  id: string;
  ruleKey: string;
  serviceType: string;
  operator?: string | null;
  role: string;
  commissionType: CommissionRuleType;
  commissionValue: string | number;
  tdsRate?: string | number | null;
  minAmount?: string | number | null;
  maxAmount?: string | number | null;
  priority: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};
export type CreateCommissionRuleInput = {
  serviceType: string;
  operator?: string;
  role: string;
  commissionType: CommissionRuleType;
  commissionValue: number;
  tdsRate: number;
  minAmount?: number;
  maxAmount?: number;
  priority?: number;
  isActive?: boolean;
};
export type UpdateCommissionRuleInput = Partial<
  Omit<CreateCommissionRuleInput, "operator" | "minAmount" | "maxAmount">
> & {
  operator?: string | null;
  minAmount?: number | null;
  maxAmount?: number | null;
};

export type CommissionDistributionType = "FIXED" | "PERCENTAGE";
export type CommissionDistribution = {
  id: string;
  distributionKey?: string;
  commissionRuleId: string;
  recipientRole: string;
  distributionType: CommissionDistributionType;
  distributionValue: string | number;
  priority: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};
export type CreateCommissionDistributionInput = {
  commissionRuleId: string;
  recipientRole: string;
  distributionType: CommissionDistributionType;
  distributionValue: number;
  priority?: number;
  isActive?: boolean;
};
export type UpdateCommissionDistributionInput = {
  recipientRole?: string;
  distributionType?: CommissionDistributionType;
  distributionValue?: number;
  priority?: number;
  isActive?: boolean;
};

export type AdminLoginMethod = "PASSWORD" | "MPIN";
export type CreateManagedAccountInput = {
  role: string;
  fullName: string;
  username: string;
  email: string;
  city: string;
  state: string;
  pincode: string;
  shopName?: string;
  shopAddress?: string;
  shopCity?: string;
  shopState?: string;
};
export type CreateManagedAccountResult = {
  success: boolean;
  message: string;
  credentialsEmailQueued: boolean;
  account: {
    id: string;
    loginId: string;
    fullName: string;
    username: string;
    email: string;
    role: string;
    onboardingStatus: string;
    temporaryCredentialsExpireAt: string;
  };
};

export class AdminApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

function messageOf(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (Array.isArray(data.message)) return data.message.join(", ");
  return messageOf(data.message) || messageOf(data.error) || messageOf(data.response);
}
function storeSession(session: AdminSession) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, session.accessToken);
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}
export function getAdminSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  try {
    return {
      ...(JSON.parse(localStorage.getItem(SESSION_KEY) || "{}") as AdminSession),
      accessToken: token,
    };
  } catch {
    return null;
  }
}
export function clearAdminSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
}
let refreshInFlight: Promise<AdminSession> | null = null;
async function parse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new AdminApiError(
      messageOf(data) || "The request could not be completed.",
      response.status,
    );
  return data as T;
}
async function performAdminRefresh(rejectedAccessToken?: string): Promise<AdminSession> {
  const latestSession = getAdminSession();
  if (
    rejectedAccessToken &&
    latestSession?.accessToken &&
    latestSession.accessToken !== rejectedAccessToken
  ) {
    return latestSession;
  }
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = fetch(`${API_URL}/super-admin/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
  })
    .then(parse<AdminSession>)
    .then((session) => {
      storeSession(session);
      return session;
    })
    .catch((error: unknown) => {
      if (error instanceof AdminApiError && (error.status === 401 || error.status === 403)) {
        clearAdminSession();
      }
      throw error;
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}
async function refresh(rejectedAccessToken?: string): Promise<AdminSession> {
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request("nexus-super-admin-session-refresh", () =>
      performAdminRefresh(rejectedAccessToken),
    );
  }
  return performAdminRefresh(rejectedAccessToken);
}
export function getAdminActor() {
  const superSession = getAdminSession();
  if (superSession)
    return {
      kind: "SUPER_ADMIN" as const,
      accessToken: superSession.accessToken,
      name: superSession.superAdmin?.fullName || "Super Admin",
      role: "SUPER_ADMIN",
    };
  const identitySession = getSession();
  const role = identitySession?.identity.role?.trim().toUpperCase();
  // PermissionGuard is the source of truth for every /admin operation. Allow an
  // identity carrying an explicitly assigned admin permission to call that
  // operation even when its business role is not a management role.
  if (identitySession && role)
    return {
      kind: "IDENTITY_ADMIN" as const,
      accessToken: identitySession.accessToken,
      name: identitySession.identity.fullName || "Administrator",
      role: role!,
    };
  return null;
}
async function call<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const actor = getAdminActor();
  const token = actor?.accessToken;
  if (!token) throw new AdminApiError("Super Admin session is missing.", 401);
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new AdminApiError("Cannot connect to the API Gateway on port 8000.", 0);
  }
  if (response.status === 401 && retry) {
    if (actor?.kind === "SUPER_ADMIN") await refresh(token);
    else await refreshSession(token);
    return call<T>(path, init, false);
  }
  return parse<T>(response);
}
const json = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

function queryString(values: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  const encoded = query.toString();
  return encoded ? `?${encoded}` : "";
}

export const adminAuthApi = {
  async login(identifier: string, loginWith: AdminLoginMethod, credential: string) {
    const response = await fetch(`${API_URL}/super-admin/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier,
        loginWith,
        password: credential,
        deviceId: getDeviceId(),
      }),
    });
    const result = await parse<AdminLoginResult>(response);
    if (!adminRequiresDeviceVerification(result)) storeSession(result);
    return result;
  },
  async verifyDeviceLogin(challengeId: string, otp: string) {
    const response = await fetch(`${API_URL}/super-admin/auth/login/verify-device`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId, otp }),
    });
    const session = await parse<AdminSession & { success: boolean; trustedDevice?: boolean }>(
      response,
    );
    storeSession(session);
    return session;
  },
  sendOnboardingPhoneOtp: (phoneNumber: string) =>
    call<{ message: string; onboardingStatus: string; nextStep: string }>(
      "/super-admin/auth/onboarding/phone/send-otp",
      json("POST", { phoneNumber }),
    ),
  verifyOnboardingPhoneOtp: (otp: string) =>
    call<{ message: string; onboardingStatus: string; nextStep: string }>(
      "/super-admin/auth/onboarding/phone/verify-otp",
      json("POST", { otp }),
    ),
  addOnboardingPan: (panNumber: string) =>
    call<{ message: string; onboardingStatus: string; nextStep: string }>(
      "/super-admin/auth/onboarding/pan",
      json("POST", { panNumber }),
    ),
  changeOnboardingPassword: (currentPassword: string, newPassword: string) =>
    call<{ message: string; onboardingRequired: boolean; nextStep: string }>(
      "/super-admin/auth/onboarding/change-password",
      json("POST", { currentPassword, newPassword }),
    ),
  changeOnboardingMpin: (currentMpin: string, newMpin: string) =>
    call<{ message: string; onboardingRequired: boolean; nextStep: null }>(
      "/super-admin/auth/onboarding/change-mpin",
      json("POST", { currentMpin, newMpin }),
    ),
  setupTpin: (currentMpin: string, newTpin: string) =>
    call<{ message: string }>(
      "/super-admin/auth/tpin/setup",
      json("POST", { currentMpin, newTpin }),
    ),
  changeTpin: (currentTpin: string, newTpin: string) =>
    call<{ message: string }>(
      "/super-admin/auth/tpin/change",
      json("POST", { currentTpin, newTpin }),
    ),
  getSessions: () => call<ActiveSession[]>("/super-admin/auth/sessions", { cache: "no-store" }),
  getSessionDetails: (sessionId: string) =>
    call<ActiveSession>(`/super-admin/auth/sessions/${encodeURIComponent(sessionId)}`, {
      cache: "no-store",
    }),
  revokeSession: (sessionId: string) =>
    call<{
      success: boolean;
      message: string;
      sessionId: string;
      isCurrent: boolean;
    }>(`/super-admin/auth/sessions/${encodeURIComponent(sessionId)}`, { method: "DELETE" }),
  revokeOtherSessions: () =>
    call<{
      success: boolean;
      message: string;
      revokedCount: number;
      currentSessionId: string;
    }>("/super-admin/auth/sessions/others", { method: "DELETE" }),
  revokeAllSessions: () =>
    call<{ success: boolean; message: string; revokedCount: number }>(
      "/super-admin/auth/sessions",
      { method: "DELETE" },
    ),
  async logout() {
    const actor = getAdminActor();
    try {
      if (actor?.kind === "SUPER_ADMIN") await call("/super-admin/auth/logout", { method: "POST" });
      else if (actor?.kind === "IDENTITY_ADMIN") await identityLogout();
    } finally {
      clearAdminSession();
      clearSession();
    }
  },
};

export function updateAdminOnboarding(nextStep: string | null, onboardingStatus?: string) {
  const session = getAdminSession();
  if (!session) return;
  storeSession({
    ...session,
    nextStep: nextStep || undefined,
    onboardingStatus: onboardingStatus || session.onboardingStatus,
    onboardingRequired: Boolean(nextStep),
  });
}

export const adminApi = {
  superAdminPayout: {
    providers: {
      list: () =>
        call<ProviderRegistryEntry[]>("/super-admin/payout/providers", { cache: "no-store" }),
      get: (publicCode: string) =>
        call<ProviderRegistryEntry>(
          `/super-admin/payout/providers/${encodeURIComponent(publicCode)}`,
          { cache: "no-store" },
        ),
      updateStatus: (publicCode: string, isActive: boolean) =>
        call<ProviderRegistryEntry>(
          `/super-admin/payout/providers/${encodeURIComponent(publicCode)}/status`,
          json("PATCH", { isActive }),
        ),
    },
    serviceControl: {
      get: () =>
        call<ServiceControlStatus>("/super-admin/payout/service/status", { cache: "no-store" }),
      update: (enabled: boolean, reason?: string) =>
        call<ServiceControlStatus>(
          "/super-admin/payout/service/status",
          json("PATCH", { enabled, ...(reason?.trim() ? { reason: reason.trim() } : {}) }),
        ),
    },
    surcharge: {
      get: (sourceWallet: PayoutSourceWallet) =>
        call<PayoutSurchargeConfiguration>(
          `/super-admin/payout/surcharge${queryString({ sourceWallet })}`,
          {
            cache: "no-store",
          },
        ),
      update: (sourceWallet: PayoutSourceWallet, type: "PERCENTAGE" | "FIXED", value: number) =>
        call<PayoutSurchargeConfiguration>(
          "/super-admin/payout/surcharge",
          json("PATCH", { sourceWallet, type, value }),
        ),
    },
  },
  adminPayout: {
    settlements: {
      list: (filters: AdminPayoutSettlementFilters = {}) =>
        call<AdminPayoutSettlementPage>(
          `/admin/payout/settlements${queryString({
            page: filters.page,
            limit: filters.limit,
            status: filters.status || undefined,
            identityId: filters.identityId?.trim() || undefined,
            paymentMode: filters.paymentMode || undefined,
            providerCode: filters.providerCode?.trim().toUpperCase() || undefined,
            fromDate: filters.fromDate || undefined,
            toDate: filters.toDate || undefined,
          })}`,
          { cache: "no-store" },
        ),
      overview: (filters: AdminPayoutOverviewFilters = {}) =>
        call<AdminPayoutOverview>(
          `/admin/payout/settlements/overview${queryString({
            range: filters.range,
            fromDate: filters.fromDate || undefined,
            toDate: filters.toDate || undefined,
            identityId: filters.identityId?.trim() || undefined,
            providerCode: filters.providerCode?.trim().toUpperCase() || undefined,
            paymentMode: filters.paymentMode || undefined,
            sourceWallet: filters.sourceWallet || undefined,
          })}`,
          { cache: "no-store" },
        ),
      get: (settlementId: string) =>
        call<AdminPayoutSettlement>(
          `/admin/payout/settlements/${encodeURIComponent(settlementId)}`,
          { cache: "no-store" },
        ),
    },
    reconciliation: {
      list: (
        filters: {
          page?: number;
          limit?: number;
          identityId?: string;
          status?: "SUBMITTING" | "UNKNOWN" | "SUCCESS" | "FAILED" | "";
        } = {},
      ) =>
        call<AdminPayoutReconciliationPage>(
          `/admin/payout/reconciliation${queryString({
            page: filters.page,
            limit: filters.limit,
            identityId: filters.identityId?.trim() || undefined,
            status: filters.status || undefined,
          })}`,
          { cache: "no-store" },
        ),
      resolve: (settlementId: string, body: ResolvePayoutReconciliationInput) =>
        call<AdminPayoutSettlement>(
          `/admin/payout/reconciliation/${encodeURIComponent(settlementId)}/resolve`,
          json("POST", body),
        ),
    },
  },
  superAdminAeps: {
    providers: {
      list: () => call<ProviderRegistryEntry[]>("/super-admin/providers", { cache: "no-store" }),
      get: (publicCode: string) =>
        call<ProviderRegistryEntry>(`/super-admin/providers/${encodeURIComponent(publicCode)}`, {
          cache: "no-store",
        }),
      updateStatus: (publicCode: string, isActive: boolean) =>
        call<ProviderRegistryEntry>(
          `/super-admin/providers/${encodeURIComponent(publicCode)}/status`,
          json("PATCH", { isActive }),
        ),
    },
    serviceControl: {
      get: (serviceType: string) =>
        call<ServiceControlStatus>(
          `/super-admin/services/${encodeURIComponent(serviceType)}/status`,
          { cache: "no-store" },
        ),
      update: (serviceType: string, enabled: boolean, reason?: string) =>
        call<ServiceControlStatus>(
          `/super-admin/services/${encodeURIComponent(serviceType)}/status`,
          json("PATCH", { enabled, ...(reason?.trim() ? { reason: reason.trim() } : {}) }),
        ),
    },
    twoFactorFee: (provider: string) =>
      call<AepsTwoFactorFeeConfiguration>(
        `/super-admin/aeps/2fa/fees/${encodeURIComponent(provider)}`,
        { cache: "no-store" },
      ),
    updateTwoFactorFee: (provider: string, feeAmount: number, reason: string) =>
      call<AepsTwoFactorFeeConfiguration>(
        `/super-admin/aeps/2fa/fees/${encodeURIComponent(provider)}`,
        json("PATCH", { feeAmount, reason }),
      ),
    twoFactorReconciliation: (query = "") =>
      call<AepsTwoFactorReconciliationPage>(
        `/super-admin/aeps/2fa/reconciliation${query ? `?${query}` : ""}`,
        { cache: "no-store" },
      ),
    resolveTwoFactor: (
      attemptId: string,
      body: {
        action: ReconciliationAction;
        reason: string;
        providerTxnRefId?: string;
        providerStatusCode?: string;
        providerStatusMessage?: string;
      },
    ) =>
      call(
        `/super-admin/aeps/2fa/reconciliation/${encodeURIComponent(attemptId)}/resolve`,
        json("POST", body),
      ),
  },
  bankVerificationReconciliation: {
    list: (query = "") =>
      call<BankVerificationReconciliationPage>(
        `/super-admin/bank-verifications/reconciliation${query ? `?${query}` : ""}`,
        { cache: "no-store" },
      ),
    resolve: (
      attemptId: string,
      body: {
        action: ReconciliationAction;
        reason: string;
        providerTxnId?: string;
        providerStatusCode?: string;
        providerStatusMessage?: string;
        accountHolderName?: string;
      },
    ) =>
      call(
        `/super-admin/bank-verifications/reconciliation/${encodeURIComponent(attemptId)}/resolve`,
        json("POST", body),
      ),
  },
  operations: {
    walletBalances: () =>
      call<AdminWalletBalances>("/super-admin/wallet/balances", { cache: "no-store" }),
    dashboardSummary: () =>
      call<AdminDashboardSummary>("/admin/dashboard/summary", { cache: "no-store" }),
    members: (query = "") =>
      call<AdminMemberPage>(`/admin/members${query ? `?${query}` : ""}`, {
        cache: "no-store",
      }),
    member: (identityId: string) =>
      call<AdminMemberDetail>(`/admin/members/${encodeURIComponent(identityId)}`, {
        cache: "no-store",
      }),
    updateMemberStatus: (identityId: string, status: string, reason?: string) =>
      call<AdminMember>(
        `/admin/members/${encodeURIComponent(identityId)}/status`,
        json("PATCH", { status, ...(reason?.trim() ? { reason: reason.trim() } : {}) }),
      ),
    bankAccounts: (query = "") =>
      call<AdminBankAccountPage>(`/admin/bank-accounts${query ? `?${query}` : ""}`, {
        cache: "no-store",
      }),
    bankAccount: (bankId: string) =>
      call<AdminBankAccountDetail>(`/admin/bank-accounts/${encodeURIComponent(bankId)}`, {
        cache: "no-store",
      }),
    approveBankAccount: (bankId: string) =>
      call<AdminBankAccountDetail>(
        `/admin/bank-accounts/${encodeURIComponent(bankId)}/approve`,
        json("PATCH", {}),
      ),
    rejectBankAccount: (bankId: string, reason: string) =>
      call<AdminBankAccountDetail>(
        `/admin/bank-accounts/${encodeURIComponent(bankId)}/reject`,
        json("PATCH", { reason: reason.trim() }),
      ),
    fundReceivingBanks: () =>
      call<AdminFundReceivingBank[]>("/super-admin/fund-receiving-bank-accounts", {
        cache: "no-store",
      }),
    createFundReceivingBank: (body: Record<string, unknown>) =>
      call<AdminFundReceivingBank>("/super-admin/fund-receiving-bank-accounts", json("POST", body)),
    setDefaultFundReceivingBank: (id: string) =>
      call<AdminFundReceivingBank>(
        `/super-admin/fund-receiving-bank-accounts/${encodeURIComponent(id)}/set-default`,
        json("PATCH", {}),
      ),
    deactivateFundReceivingBank: (id: string) =>
      call<AdminFundReceivingBank>(
        `/super-admin/fund-receiving-bank-accounts/${encodeURIComponent(id)}`,
        { method: "DELETE" },
      ),
    fundRequests: (status = "") =>
      call<AdminFundRequest[]>(
        `/super-admin/fund-requests${status ? `?status=${encodeURIComponent(status)}` : ""}`,
        { cache: "no-store" },
      ),
    approveFundRequest: (referenceId: string, tpin: string, adminRemark?: string) =>
      call<AdminFundRequest>(
        `/super-admin/fund-requests/${encodeURIComponent(referenceId)}/approve`,
        json("POST", { tpin, ...(adminRemark?.trim() ? { adminRemark: adminRemark.trim() } : {}) }),
      ),
    rejectFundRequest: (referenceId: string, reason: string) =>
      call<AdminFundRequest>(
        `/super-admin/fund-requests/${encodeURIComponent(referenceId)}/reject`,
        json("POST", { reason: reason.trim() }),
      ),
    reinitiateFundRequest: (referenceId: string, reason: string) =>
      call<AdminFundRequest>(
        `/super-admin/fund-requests/${encodeURIComponent(referenceId)}/reinitiate`,
        json("POST", { reason: reason.trim() }),
      ),
    manualWalletCredit: (
      walletType: "main" | "aeps",
      body: { targetLoginId: string; amount: number; reason: string; tpin: string },
      idempotencyKey: string,
    ) =>
      call<Record<string, unknown>>(`/super-admin/wallet/manual-credit/${walletType}`, {
        ...json("POST", body),
        headers: { "Idempotency-Key": idempotencyKey },
      }),
    directWalletDeduct: (
      body: { targetLoginId: string; amount: number; reason: string; tpin: string },
      idempotencyKey: string,
    ) =>
      call<Record<string, unknown>>("/super-admin/wallet/deduct", {
        ...json("POST", body),
        headers: { "Idempotency-Key": idempotencyKey },
      }),
    transferAepsWallet: (
      body: {
        sourceLoginId: string;
        targetLoginId: string;
        amount: number;
        reason: string;
        tpin: string;
      },
      idempotencyKey: string,
    ) =>
      call<Record<string, unknown>>("/super-admin/wallet/aeps-transfer", {
        ...json("POST", body),
        headers: { "Idempotency-Key": idempotencyKey },
      }),
    createFundHold: (
      body: { targetLoginId: string; amount: number; reason: string; tpin: string },
      idempotencyKey: string,
    ) =>
      call<AdminFundHold>("/super-admin/wallet/holds", {
        ...json("POST", body),
        headers: { "Idempotency-Key": idempotencyKey },
      }),
    fundHolds: (status = "") =>
      call<AdminFundHoldPage>(
        `/super-admin/wallet/holds?limit=50${status ? `&status=${encodeURIComponent(status)}` : ""}`,
        { cache: "no-store" },
      ),
    releaseFundHold: (
      referenceId: string,
      body: { reason: string; tpin: string },
      idempotencyKey: string,
    ) =>
      call<AdminFundHold>(`/super-admin/wallet/holds/${encodeURIComponent(referenceId)}/release`, {
        ...json("POST", body),
        headers: { "Idempotency-Key": idempotencyKey },
      }),
    updateAepsMerchantStatus: (identityId: string, status: string, reason?: string) =>
      call<Record<string, unknown>>(
        `/admin/aeps/merchants/${encodeURIComponent(identityId)}/status`,
        json("PATCH", { status, ...(reason?.trim() ? { reason: reason.trim() } : {}) }),
      ),
    walletLedger: (identityId: string, query = "") =>
      call<AdminWalletLedgerPage>(
        `/admin/wallets/${encodeURIComponent(identityId)}/ledger${query ? `?${query}` : ""}`,
        { cache: "no-store" },
      ),
    aepsProviderStatus: () =>
      call<AdminAepsProviderStatus>("/admin/aeps/providers/status", { cache: "no-store" }),
    updateAepsProviderServiceStatus: (
      provider: string,
      operation: string,
      isEnabled: boolean,
      reason?: string,
    ) =>
      call<Record<string, unknown>>(
        `/admin/aeps/providers/${encodeURIComponent(provider)}/services/${encodeURIComponent(operation)}/status`,
        json("PATCH", {
          isEnabled,
          ...(reason?.trim() ? { reason: reason.trim() } : {}),
        }),
      ),
  },
  roles: {
    list: () => call<unknown>("/roles"),
    get: (id: string) => call<AdminEntity>(`/roles/${encodeURIComponent(id)}`),
    create: (body: unknown) => call("/roles", json("POST", body)),
    update: (id: string, body: unknown) => call(`/roles/${id}`, json("PATCH", body)),
    status: (id: string, isActive: boolean) =>
      call(`/roles/${id}/status`, json("PATCH", { isActive })),
    packages: (id: string) => call<RolePackageAssignment[]>(`/roles/${id}/packages`),
    assignPackage: (id: string, packageId: string) =>
      call<RolePackageAssignment>(`/roles/${id}/packages`, json("POST", { packageId })),
    removePackage: (id: string, packageId: string) =>
      call(`/roles/${id}/packages/${packageId}`, { method: "DELETE" }),
    registrationPermissions: (id: string) =>
      call<RoleRegisterPermission[]>(`/roles/${id}/register-permissions`),
    allowRegistration: (id: string, targetRoleId: string) =>
      call<RoleRegisterPermission>(
        `/roles/${id}/register-permissions`,
        json("POST", { targetRoleId, isActive: true }),
      ),
    registrationStatus: (id: string, targetRoleId: string, isActive: boolean) =>
      call<RoleRegisterPermission>(
        `/roles/${id}/register-permissions/${targetRoleId}/status`,
        json("PATCH", { isActive }),
      ),
    removeRegistration: (id: string, targetRoleId: string) =>
      call(`/roles/${id}/register-permissions/${targetRoleId}`, { method: "DELETE" }),
    effectivePermissions: (id: string) =>
      call<RoleEffectiveAccess>(`/roles/${id}/effective-permissions`),
  },
  permissions: {
    list: () => call<unknown>("/permissions"),
    get: (id: string) => call<AdminEntity>(`/permissions/${encodeURIComponent(id)}`),
    create: (body: unknown) => call("/permissions", json("POST", body)),
    update: (id: string, body: unknown) => call(`/permissions/${id}`, json("PATCH", body)),
    status: (id: string, isActive: boolean) =>
      call(`/permissions/${id}/status`, json("PATCH", { isActive })),
  },
  packages: {
    list: () => call<unknown>("/packages"),
    get: (id: string) => call<AdminEntity>(`/packages/${encodeURIComponent(id)}`),
    create: (body: unknown) => call("/packages", json("POST", body)),
    update: (id: string, body: unknown) => call(`/packages/${id}`, json("PATCH", body)),
    status: (id: string, isActive: boolean) =>
      call(`/packages/${id}/status`, json("PATCH", { isActive })),
    permissions: (id: string) => call<PackagePermissionAssignment[]>(`/packages/${id}/permissions`),
    assignPermission: (id: string, permissionId: string) =>
      call(`/packages/${id}/permissions`, json("POST", { permissionId })),
    removePermission: (id: string, permissionId: string) =>
      call(`/packages/${id}/permissions/${permissionId}`, { method: "DELETE" }),
  },
  async createAccount(body: CreateManagedAccountInput) {
    const actor = getAdminActor();
    const path = actor?.kind === "SUPER_ADMIN" ? "/super-admin/accounts" : "/accounts";
    try {
      return await call<CreateManagedAccountResult>(path, json("POST", body));
    } catch (error) {
      if (error instanceof AdminApiError && error.status >= 500)
        throw new AdminApiError(
          "The account service could not complete the request. Confirm admin-service and auth-service are connected to Kafka, then try again.",
          error.status,
        );
      throw error;
    }
  },
  async registerableRoles(): Promise<AdminEntity[]> {
    const actor = getAdminActor();
    if (actor?.kind !== "SUPER_ADMIN") {
      return call<AdminEntity[]>("/accounts/registerable-roles", { cache: "no-store" });
    }

    const roles = asArray<AdminEntity>(await call<unknown>("/roles", { cache: "no-store" }));
    const registrar = roles.find(
      (role) => role.name.toUpperCase().replace(/[ -]+/g, "_") === "SUPER_ADMIN",
    );
    if (!registrar) return [];
    const assignments = await call<RoleRegisterPermission[]>(
      `/roles/${encodeURIComponent(registrar.id)}/register-permissions`,
      { cache: "no-store" },
    );
    return assignments
      .filter((assignment) => assignment.isActive && assignment.targetRole.isActive)
      .map((assignment) => assignment.targetRole);
  },
  auditLogs: (query = "") => {
    const path = getAdminActor()?.kind === "SUPER_ADMIN" ? "/audit" : "/audit/me";
    return call<AuditPage>(`${path}${query ? `?${query}` : ""}`);
  },
  auditLog: (auditId: string) => call<AuditLog>(`/audit/me/${encodeURIComponent(auditId)}`),
  aepsOverview: (filters: AepsOverviewFilters = {}) =>
    call<AepsOverviewMetrics>(
      `/admin/transactions/aeps/overview${queryString({
        provider: filters.provider?.trim().toUpperCase() || undefined,
        operation: filters.operation || undefined,
        range: filters.range,
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
      })}`,
      { cache: "no-store" },
    ),
  transaction: (referenceId: string) =>
    call<TransactionDetail>(`/admin/transactions/provider/${encodeURIComponent(referenceId)}`),
  providerTransactions: (query = "") =>
    call<AdminProviderTransactionPage>(`/admin/transactions/provider${query ? `?${query}` : ""}`),
  pendingProviderIncome: (query = "") =>
    call<AdminProviderTransactionPage>(
      `/admin/transactions/provider-income/pending${query ? `?${query}` : ""}`,
    ),
  reconcileProviderIncome: (referenceId: string, body: ProviderIncomeInput) =>
    call(
      `/admin/transactions/${encodeURIComponent(referenceId)}/provider-income/reconcile`,
      json("POST", body),
    ),
  reconciliation: (query = "") =>
    call<ReconciliationPage>(`/admin/transactions/reconciliation${query ? `?${query}` : ""}`),
  resolveTransaction: (referenceId: string, body: ResolveTransactionInput) =>
    call<ResolveTransactionResult>(
      `/admin/transactions/reconciliation/${encodeURIComponent(referenceId)}/resolve`,
      json("POST", body),
    ),
  recoverFinancialEffects: (referenceId: string) =>
    call<RecoverFinancialEffectsResult>(
      buildFinancialRecoveryPath(referenceId),
      financialRecoveryRequestInit(),
    ),
  requestReversal: (referenceId: string, reason: string, idempotencyKey: string) =>
    call<ReversalRequestResult>(`/admin/transactions/${encodeURIComponent(referenceId)}/reversal`, {
      ...json("POST", { reason }),
      headers: { "Idempotency-Key": idempotencyKey },
    }),
  reversals: (query = "") =>
    call<ProviderReversalPage>(`/admin/transactions/reversals${query ? `?${query}` : ""}`),
  reversal: (referenceId: string) =>
    call<ProviderReversalDetail>(
      `/admin/transactions/reversals/${encodeURIComponent(referenceId)}`,
    ),
  processReversal: (referenceId: string) =>
    call<ProviderReversalDetail>(
      `/admin/transactions/reversals/${encodeURIComponent(referenceId)}/process`,
      { method: "POST" },
    ),
  kycReview: {
    list: (query = "") =>
      call<KycReviewPage>(`/kyc/review${query ? `?${query}` : ""}`, { cache: "no-store" }),
    get: (identityId: string, accountType: KycReviewAccountType) =>
      call<KycReviewDetail>(
        `/kyc/review/${encodeURIComponent(identityId)}?accountType=${accountType}`,
        { cache: "no-store" },
      ),
    document: (
      identityId: string,
      accountType: KycReviewAccountType,
      documentId: string,
      status: "APPROVED" | "REJECTED",
      rejectionReason?: string,
    ) =>
      call(
        `/kyc/review/${encodeURIComponent(identityId)}/documents/${encodeURIComponent(documentId)}?accountType=${accountType}`,
        json("PATCH", { status, ...(rejectionReason ? { rejectionReason } : {}) }),
      ),
    video: (
      identityId: string,
      accountType: KycReviewAccountType,
      status: "APPROVED" | "REJECTED",
      rejectionReason?: string,
    ) =>
      call(
        `/kyc/review/${encodeURIComponent(identityId)}/video?accountType=${accountType}`,
        json("PATCH", { status, ...(rejectionReason ? { rejectionReason } : {}) }),
      ),
    approve: (identityId: string, accountType: KycReviewAccountType, remarks?: string) =>
      call(
        `/kyc/review/${encodeURIComponent(identityId)}/approve?accountType=${accountType}`,
        json("POST", { ...(remarks ? { remarks } : {}) }),
      ),
    reject: (identityId: string, accountType: KycReviewAccountType, remarks: string) =>
      call(
        `/kyc/review/${encodeURIComponent(identityId)}/reject?accountType=${accountType}`,
        json("POST", { remarks }),
      ),
  },
  commissionRules: {
    list: () => call<CommissionRule[]>("/commission-rules"),
    get: (id: string) => call<CommissionRule>(`/commission-rules/${encodeURIComponent(id)}`),
    create: (body: CreateCommissionRuleInput) =>
      call<CommissionRule>("/commission-rules", json("POST", body)),
    update: (id: string, body: UpdateCommissionRuleInput) =>
      call<CommissionRule>(`/commission-rules/${encodeURIComponent(id)}`, json("PATCH", body)),
    deactivate: (id: string) =>
      call<CommissionRule>(`/commission-rules/${encodeURIComponent(id)}`, { method: "DELETE" }),
  },
  commissionDistributions: {
    list: (commissionRuleId?: string) =>
      call<CommissionDistribution[]>(
        `/commission-distributions/distributions${
          commissionRuleId ? `?commissionRuleId=${encodeURIComponent(commissionRuleId)}` : ""
        }`,
      ),
    get: (id: string) =>
      call<CommissionDistribution>(
        `/commission-distributions/distributions/${encodeURIComponent(id)}`,
      ),
    create: (body: CreateCommissionDistributionInput) =>
      call<CommissionDistribution>("/commission-distributions/distributions", json("POST", body)),
    update: (id: string, body: UpdateCommissionDistributionInput) =>
      call<CommissionDistribution>(
        `/commission-distributions/distributions/${encodeURIComponent(id)}`,
        json("PATCH", body),
      ),
    deactivate: (id: string) =>
      call<CommissionDistribution>(
        `/commission-distributions/distributions/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        },
      ),
  },
  commissionHierarchy: {
    list: (serviceType?: string) =>
      call<CommissionHierarchy[]>(
        `/commission-hierarchy${serviceType ? `?serviceType=${encodeURIComponent(serviceType)}` : ""}`,
      ),
    create: (body: Omit<CommissionHierarchy, "id" | "createdAt" | "updatedAt">) =>
      call<CommissionHierarchy>("/commission-hierarchy", json("POST", body)),
    update: (id: string, body: { serviceType?: string; isActive?: boolean }) =>
      call<CommissionHierarchy>(
        `/commission-hierarchy/${encodeURIComponent(id)}`,
        json("PATCH", body),
      ),
    remove: (id: string) =>
      call(`/commission-hierarchy/${encodeURIComponent(id)}`, { method: "DELETE" }),
    resolve: (sourceUserId: string, serviceType: string) =>
      call<unknown>(
        `/commission-hierarchy/resolve/${encodeURIComponent(sourceUserId)}?serviceType=${encodeURIComponent(serviceType)}`,
      ),
    parents: (childUserId: string, serviceType?: string) =>
      call<CommissionHierarchy[]>(
        `/commission-hierarchy/child/${encodeURIComponent(childUserId)}/parents${serviceType ? `?serviceType=${encodeURIComponent(serviceType)}` : ""}`,
      ),
    children: (parentUserId: string) =>
      call<CommissionHierarchy[]>(
        `/commission-hierarchy/parent/${encodeURIComponent(parentUserId)}/children`,
      ),
    get: (id: string) =>
      call<CommissionHierarchy>(`/commission-hierarchy/${encodeURIComponent(id)}`),
  },
};

export function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (!value || typeof value !== "object") return [];
  const object = value as Record<string, unknown>;
  for (const key of [
    "data",
    "items",
    "results",
    "records",
    "roles",
    "permissions",
    "packages",
    "transactions",
    "logs",
  ])
    if (Array.isArray(object[key])) return object[key] as T[];
  if (object.data && typeof object.data === "object") return asArray<T>(object.data);
  return [];
}
