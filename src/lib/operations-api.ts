import { ApiError, authenticatedRequest } from "./auth-api";

export type WalletBalances = {
  userId: string;
  wallets: {
    main: number;
    mainHeld?: number;
    mainAvailable?: number;
    aeps: number;
    profit: number;
  };
};

export type WalletTransferInput = {
  receiverLoginId: string;
  amount: number;
  description?: string;
};

export type WalletTransferTransaction = {
  id: string;
  referenceId: string;
  userId: string;
  walletType: "MAIN";
  serviceType: "PEER_TRANSFER";
  type: "DEBIT" | "CREDIT";
  amount: string;
  openingBalance: string;
  closingBalance: string;
  status: "SUCCESS";
  description?: string | null;
  externalReference?: string | null;
  createdAt?: string;
};

export type WalletTransferResult = {
  duplicate: boolean;
  transferReference: string;
  senderTransaction: WalletTransferTransaction;
  receiverTransaction: WalletTransferTransaction;
  // Kept optional so older screens compile while they are migrated to the
  // actual peer-transfer response shape above.
  referenceId?: string;
  transaction?: { referenceId?: string };
};

export type AepsToMainTransferResult = {
  duplicate: boolean;
  transferReference: string;
  aepsDebit: WalletTransferTransaction;
  mainCredit: WalletTransferTransaction;
};

export type WalletTransferOtpChallenge = {
  success: boolean;
  challengeId: string;
  receiver: { loginId: string; fullName?: string };
  amount: number;
  phoneNumber: string;
  expiresInSeconds: number;
  message: string;
  devOtp?: string;
};

export type WalletLedgerEntry = {
  referenceId: string;
  walletType: "MAIN" | "AEPS" | "PROFIT";
  serviceType: string;
  title: string;
  type: "CREDIT" | "DEBIT";
  amount: string;
  openingBalance: string;
  closingBalance: string;
  status: string;
  description?: string | null;
  createdAt: string;
};

export type WalletLedgerPage = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  data: WalletLedgerEntry[];
};

export type TransactionLedgerFilters = {
  walletType?: "MAIN" | "AEPS" | "PROFIT";
  type?: "CREDIT" | "DEBIT";
  status?: "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED" | "REVERSED" | "REFUNDED";
  serviceType?: string;
  fromDate?: string;
  toDate?: string;
};

export type TransactionLedgerReportPage = {
  limit: number;
  hasNext: boolean;
  nextCursor: string | null;
  filters: Record<string, unknown>;
  data: Array<WalletLedgerEntry & { sequence: string; updatedAt: string }>;
};

export type TransactionLedgerSummary = {
  filters: Record<string, unknown>;
  totalTransactions: number;
  totalCreditAmount: string;
  totalDebitAmount: string;
  netMovement: string;
  wallets: Array<{
    walletType: "MAIN" | "AEPS" | "PROFIT";
    transactionCount: number;
    creditCount: number;
    debitCount: number;
    creditAmount: string;
    debitAmount: string;
    balanceAtPeriodEnd: string;
  }>;
};

export type FundReceivingBank = {
  id: string;
  displayName?: string | null;
  bankName: string;
  ifsc: string;
  branchName?: string | null;
  accountHolderName: string;
  accountNumberLast4: string;
  maskedAccountNumber: string;
  accountType: string;
  upiId?: string | null;
  isDefault: boolean;
};

export type FundRequest = {
  id: string;
  referenceId: string;
  amount: string;
  receivingBankAccountId: string;
  paymentMode: string;
  paymentReference?: string | null;
  paymentDate: string;
  remark?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "REINITIATE" | "CANCELLED";
  adminRemark?: string | null;
  walletTransactionReference?: string | null;
  createdAt: string;
};

export type FundRequestInput = {
  amount: number;
  receivingBankAccountId: string;
  paymentMode: string;
  paymentReference?: string;
  paymentDate: string;
  remark?: string;
};

export type ProviderOperation = "BE" | "MS" | "CW" | "AP" | "CD";
export type ProviderTransactionStatus =
  "INITIATED" | "PROCESSING" | "SUCCESS" | "FAILED" | "PENDING" | "UNKNOWN" | "REVERSED";

export type ProviderTransaction = {
  id: string;
  identityId?: string;
  networkDepth?: number;
  referenceId: string;
  serviceType: string;
  provider: string;
  operation: ProviderOperation;
  amount: string;
  status: ProviderTransactionStatus;
  providerMerchantRefId?: string | null;
  providerReference?: string | null;
  providerTxnRefId?: string | null;
  rrn?: string | null;
  npciCode?: string | null;
  npciMessage?: string | null;
  providerStatusCode?: string | null;
  providerStatusMessage?: string | null;
  bankIIN?: string | null;
  aadhaarLast4?: string | null;
  createdAt: string;
  completedAt?: string | null;
  needsReconciliation: boolean;
  settlementStatus?: string;
  commissionStatus?: string;
  commissionAmount?: string | null;
  providerIncomeSource?: string | null;
  sourceRole?: string;
};

export type ProviderTransactionPage = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  data: ProviderTransaction[];
};

export type ProviderTransactionReceipt = {
  provider: string;
  transactionType: ProviderOperation;
  transactionTypeLabel: string;
  status: ProviderTransactionStatus;
  statusDescription?: string | null;
  transactionReferenceId: string;
  providerReference?: string | null;
  ackNo?: string | null;
  rrn?: string | null;
  clientRefNo?: string | null;
  amount: string;
  transactionDateTime: string;
  bankIIN?: string | null;
  maskedAadhaar?: string | null;
  npciCode?: string | null;
  npciMessage?: string | null;
  availableBalance?: string | null;
  reversed: boolean;
  reversedAt?: string | null;
};

export type AuditLog = {
  id: string;
  eventId: string;
  service: string;
  action: string;
  status: "SUCCESS" | "FAILED";
  httpMethod?: string | null;
  endpoint?: string | null;
  statusCode?: number | null;
  createdAt: string;
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

const queryString = (values: Record<string, string | number | undefined>) => {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  return query.toString();
};

function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
  }

  return `wallet-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export const operationsApi = {
  balance: (token: string, walletType: "MAIN" | "AEPS" | "PROFIT") =>
    authenticatedRequest<number>(`/transactions/balance/${walletType}`, {}, token),

  balances: (token: string, _userId?: string) =>
    authenticatedRequest<WalletBalances>("/wallet/balances", { cache: "no-store" }, token),

  requestTransferOtp: (
    token: string,
    body: WalletTransferInput,
    idempotencyKey = createIdempotencyKey(),
  ) =>
    authenticatedRequest<WalletTransferOtpChallenge>(
      "/wallet/transfer/request-otp",
      {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify(body),
      },
      token,
    ),

  confirmTransferOtp: (token: string, challengeId: string, otp: string) =>
    authenticatedRequest<WalletTransferResult>(
      "/wallet/transfer/confirm",
      {
        method: "POST",
        body: JSON.stringify({ challengeId, otp }),
        signal: AbortSignal.timeout(20_000),
      },
      token,
    ),

  aepsToMain: (
    token: string,
    body: { amount: number; tpin: string; description?: string },
    idempotencyKey = createIdempotencyKey(),
  ) =>
    authenticatedRequest<AepsToMainTransferResult>(
      "/wallet/transfer/aeps-to-main",
      {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify(body),
      },
      token,
    ),

  walletTransactions: (
    token: string,
    filters: { page?: number; limit?: number; walletType?: string; type?: string } = {},
  ) =>
    authenticatedRequest<WalletLedgerPage>(
      `/wallet/transactions?${queryString({
        page: filters.page ?? 1,
        limit: filters.limit ?? 20,
        walletType: filters.walletType,
        type: filters.type,
      })}`,
      { cache: "no-store" },
      token,
    ),

  transactionLedgerReport: (
    token: string,
    filters: TransactionLedgerFilters & { limit?: number; cursor?: string } = {},
  ) =>
    authenticatedRequest<TransactionLedgerReportPage>(
      `/transaction-ledger/me?${queryString({
        limit: filters.limit ?? 50,
        cursor: filters.cursor,
        walletType: filters.walletType,
        type: filters.type,
        status: filters.status,
        serviceType: filters.serviceType,
        fromDate: filters.fromDate,
        toDate: filters.toDate,
      })}`,
      { cache: "no-store" },
      token,
    ),

  transactionLedgerEntry: (token: string, referenceId: string) =>
    authenticatedRequest<
      WalletLedgerEntry & {
        sequence: string;
        updatedAt: string;
        description?: string | null;
        externalReference?: string | null;
      }
    >(`/transaction-ledger/me/${encodeURIComponent(referenceId)}`, { cache: "no-store" }, token),

  transactionLedgerSummary: (token: string, filters: TransactionLedgerFilters = {}) =>
    authenticatedRequest<TransactionLedgerSummary>(
      `/transaction-ledger/me/summary?${queryString({
        walletType: filters.walletType,
        type: filters.type,
        status: filters.status,
        serviceType: filters.serviceType,
        fromDate: filters.fromDate,
        toDate: filters.toDate,
      })}`,
      { cache: "no-store" },
      token,
    ),

  walletHolds: (token: string, filters: { status?: string; page?: number; limit?: number } = {}) =>
    authenticatedRequest<{
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      data: Array<{
        id: string;
        referenceId: string;
        walletType: string;
        amount: string;
        reason: string;
        status: string;
        resolutionReason?: string | null;
        releasedAt?: string | null;
        createdAt: string;
      }>;
    }>(
      `/wallet/holds?${queryString({
        page: filters.page ?? 1,
        limit: filters.limit ?? 20,
        status: filters.status,
      })}`,
      { cache: "no-store" },
      token,
    ),

  receivingBanks: (token: string) =>
    authenticatedRequest<FundReceivingBank[]>(
      "/fund-receiving-bank-accounts",
      { cache: "no-store" },
      token,
    ),

  fundRequests: (token: string) =>
    authenticatedRequest<FundRequest[]>("/fund-requests", { cache: "no-store" }, token),

  createFundRequest: (
    token: string,
    body: FundRequestInput,
    idempotencyKey = createIdempotencyKey(),
  ) =>
    authenticatedRequest<FundRequest>(
      "/fund-requests",
      {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify(body),
      },
      token,
    ),

  resubmitFundRequest: (token: string, referenceId: string, body: FundRequestInput) =>
    authenticatedRequest<FundRequest>(
      `/fund-requests/${encodeURIComponent(referenceId)}/resubmit`,
      { method: "PATCH", body: JSON.stringify(body) },
      token,
    ),

  cancelFundRequest: (token: string, referenceId: string) =>
    authenticatedRequest<FundRequest>(
      `/fund-requests/${encodeURIComponent(referenceId)}/cancel`,
      { method: "POST", body: JSON.stringify({}) },
      token,
    ),

  calculateCommission: (
    token: string,
    body: {
      userId: string;
      role: string;
      serviceType: string;
      operator?: string;
      transactionAmount: number;
      idempotencyKey: string;
    },
  ) =>
    authenticatedRequest<Record<string, unknown>>(
      "/wallet/calculate-commission",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      token,
    ),

  transactions: (
    token: string,
    filters: {
      page?: number;
      limit?: number;
      operation?: ProviderOperation;
      status?: ProviderTransactionStatus;
      provider?: string;
      serviceType?: string;
    } = {},
  ) =>
    authenticatedRequest<ProviderTransactionPage>(
      `/aeps/transactions?${queryString({
        page: filters.page ?? 1,
        limit: filters.limit ?? 20,
        operation: filters.operation,
        status: filters.status,
        provider: filters.provider,
        serviceType: filters.serviceType,
      })}`,
      {},
      token,
    ),

  networkTransactions: (
    token: string,
    filters: {
      page?: number;
      limit?: number;
      operation?: ProviderOperation;
      status?: ProviderTransactionStatus;
      provider?: string;
    } = {},
  ) =>
    authenticatedRequest<ProviderTransactionPage>(
      `/aeps/network-transactions?${queryString({
        page: filters.page ?? 1,
        limit: filters.limit ?? 20,
        operation: filters.operation,
        status: filters.status,
        provider: filters.provider,
      })}`,
      {},
      token,
    ),

  transaction: (token: string, referenceId: string) =>
    authenticatedRequest<ProviderTransaction>(
      `/aeps/transactions/${encodeURIComponent(referenceId)}`,
      {},
      token,
    ),

  receipt: (token: string, referenceId: string) =>
    authenticatedRequest<ProviderTransactionReceipt>(
      `/aeps/transactions/${encodeURIComponent(referenceId)}/receipt`,
      {},
      token,
    ),

  networkTransaction: (token: string, referenceId: string) =>
    authenticatedRequest<ProviderTransaction>(
      `/aeps/network-transactions/${encodeURIComponent(referenceId)}`,
      {},
      token,
    ),

  networkReceipt: (token: string, referenceId: string) =>
    authenticatedRequest<ProviderTransactionReceipt>(
      `/aeps/network-transactions/${encodeURIComponent(referenceId)}/receipt`,
      {},
      token,
    ),

  audits: (
    token: string,
    filters: {
      page?: number;
      limit?: number;
      service?: string;
      action?: string;
      status?: "SUCCESS" | "FAILED";
    } = {},
  ) =>
    authenticatedRequest<AuditPage>(
      `/audit/me?${queryString({
        page: filters.page ?? 1,
        limit: filters.limit ?? 20,
        service: filters.service,
        action: filters.action,
        status: filters.status,
      })}`,
      {},
      token,
    ),

  audit: (token: string, auditId: string) =>
    authenticatedRequest<AuditLog>(`/audit/me/${encodeURIComponent(auditId)}`, {}, token),
};

export function newTransferIdempotencyKey(): string {
  return createIdempotencyKey();
}

export function operationsMessage(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : error instanceof Error
      ? error.message
      : "Request failed.";
}
