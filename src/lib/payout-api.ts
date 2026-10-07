import { ApiError, authenticatedRequest } from "@/lib/auth-api";
import { createIdempotencyKey } from "@/lib/idempotency-key";

export type PayoutProvider = {
  providerCode: string;
  providerName: string;
  status: "AVAILABLE";
};

export type PayoutPaymentMode = "IMPS" | "NEFT";
export type PayoutSourceWallet = "AEPS" | "MAIN";

export type PayoutSettlementStatus =
  | "CREATED"
  | "WALLET_RESERVE_PENDING"
  | "RESERVED"
  | "SUBMITTING"
  | "QUEUED"
  | "PENDING"
  | "SUCCESS"
  | "FAILED"
  | "UNKNOWN";

export type PayoutWalletState =
  | "NOT_RESERVED"
  | "RESERVE_PENDING"
  | "RESERVED"
  | "CAPTURE_PENDING"
  | "CAPTURED"
  | "RELEASE_PENDING"
  | "RELEASED"
  | "UNKNOWN";

export type PayoutSettlement = {
  id: string;
  merchantRefId: string;
  providerReference?: string | null;
  providerCode: string;
  status: PayoutSettlementStatus;
  walletState: PayoutWalletState;
  amount: string;
  surcharge: {
    type: "PERCENTAGE" | "FIXED";
    value: string;
    amount: string;
  };
  totalWalletDebit: string;
  sourceWallet: PayoutSourceWallet;
  paymentMode: PayoutPaymentMode;
  bankAccount: {
    id: string;
    last4: string;
  };
  createdAt: string;
  updatedAt: string;
};

export type PayoutSettlementDetail = PayoutSettlement & {
  providerReference: string | null;
  rrn: string | null;
  failure: {
    code: string | null;
    message: string | null;
  } | null;
  timeline: {
    queuedAt: string | null;
    callbackReceivedAt: string | null;
    completedAt: string | null;
  };
};

export type PayoutPage<T = PayoutSettlement> = {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type PayoutHistoryQuery = {
  page?: number;
  limit?: number;
  status?: PayoutSettlementStatus | "";
};

export type PayoutReceipt = {
  receiptType: "PAYOUT";
  receiptNumber: string;
  transactionId: string;
  status: PayoutSettlementStatus;
  currency: "INR";
  paymentMode: PayoutPaymentMode;
  sourceWallet: PayoutSourceWallet;
  transactionAmount: string;
  platformCharges: {
    label: string;
    amount: string;
    gstIncluded: boolean;
    taxableAmount: string;
    gst: {
      rate: string;
      amount: string;
    };
  };
  totalAmount: string;
  beneficiary: {
    name: string;
    accountNumber: string | null;
    ifsc: string;
  };
  references: {
    merchant: string;
    provider: string | null;
    rrn: string | null;
  };
  timestamps: {
    initiatedAt: string;
    completedAt: string | null;
    updatedAt: string;
  };
};

export type CreatePayoutSettlementInput = {
  bankAccountId: string;
  amount: number;
  paymentMode: PayoutPaymentMode;
  sourceWallet?: "AEPS";
  tpin: string;
  latitude: number;
  longitude: number;
};

function queryString(values: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  const encoded = query.toString();
  return encoded ? `?${encoded}` : "";
}

export const payoutApi = {
  providers: (token: string) =>
    authenticatedRequest<PayoutProvider[]>("/payout/providers", { cache: "no-store" }, token),

  createSettlement: (
    token: string,
    providerCode: string,
    body: CreatePayoutSettlementInput,
    idempotencyKey = createIdempotencyKey("payout"),
  ) =>
    authenticatedRequest<PayoutSettlement>(
      `/payout/providers/${encodeURIComponent(providerCode)}/settlements`,
      {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120_000),
      },
      token,
    ),

  history: (token: string, query: PayoutHistoryQuery = {}) =>
    authenticatedRequest<PayoutPage>(
      `/payout/history${queryString({
        page: query.page,
        limit: query.limit,
        status: query.status || undefined,
      })}`,
      { cache: "no-store" },
      token,
    ),

  status: (token: string, reference: string) =>
    authenticatedRequest<PayoutSettlementDetail>(
      `/payout/status/${encodeURIComponent(reference)}`,
      { cache: "no-store" },
      token,
    ),

  detail: (token: string, transactionId: string) =>
    authenticatedRequest<PayoutSettlementDetail>(
      `/payout/${encodeURIComponent(transactionId)}`,
      { cache: "no-store" },
      token,
    ),

  receipt: (token: string, transactionId: string) =>
    authenticatedRequest<PayoutReceipt>(
      `/payout/${encodeURIComponent(transactionId)}/receipt`,
      { cache: "no-store" },
      token,
    ),
};

export function payoutMessage(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : error instanceof Error
      ? error.message
      : "The payout request could not be completed.";
}
