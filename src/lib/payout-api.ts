import { ApiError, authenticatedRequest } from "@/lib/auth-api";
import { createIdempotencyKey } from "@/lib/idempotency-key";

export type PayoutProvider = {
  providerCode: string;
  providerName: string;
  status: "AVAILABLE";
};

export type PayoutPaymentMode = "IMPS" | "NEFT";

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
  paymentMode: PayoutPaymentMode;
  bankAccount: {
    id: string;
    last4: string;
  };
  createdAt: string;
  updatedAt: string;
};

export type CreatePayoutSettlementInput = {
  bankAccountId: string;
  amount: number;
  paymentMode: PayoutPaymentMode;
  latitude: number;
  longitude: number;
};

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
};

export function payoutMessage(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : error instanceof Error
      ? error.message
      : "The payout request could not be completed.";
}
