import { ApiError, authenticatedRequest } from "./auth-api";

export type WalletBalances = {
  userId: string;
  wallets: { main: number; aeps: number; profit: number };
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

export type ProviderOperation = "BE" | "MS" | "CW" | "AP" | "CD";
export type ProviderTransactionStatus =
  "INITIATED" | "PROCESSING" | "SUCCESS" | "FAILED" | "PENDING" | "UNKNOWN" | "REVERSED";

export type ProviderTransaction = {
  id: string;
  referenceId: string;
  serviceType: string;
  provider: string;
  operation: ProviderOperation;
  amount: string;
  status: ProviderTransactionStatus;
  providerMerchantRefId?: string | null;
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

  balances: (token: string, userId: string) =>
    authenticatedRequest<WalletBalances>(
      `/wallet/balances/${encodeURIComponent(userId)}`,
      {},
      token,
    ),

  transfer: (token: string, body: WalletTransferInput, idempotencyKey = createIdempotencyKey()) =>
    authenticatedRequest<WalletTransferResult>(
      "/wallet/transfer",
      {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify(body),
      },
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
