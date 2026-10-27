export type PayoutFailureFields = {
  status: string;
  npciCode?: string | null;
  npciMessage?: string | null;
  statusDescription?: string | null;
  failure?: {
    code: string | null;
    message: string | null;
  } | null;
};

export type PayoutProviderIdentity = {
  publicCode?: string | null;
  publicName?: string | null;
  providerCode?: string | null;
  providerName?: string | null;
};

export const PAYOUT_TOTAL_DEBIT_LABEL = "Total wallet debit";

function presentText(value: string | null | undefined): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export function payoutFailureDescription(value: PayoutFailureFields): string | null {
  if (value.status !== "FAILED") return null;
  return (
    presentText(value.npciMessage) ??
    presentText(value.statusDescription) ??
    presentText(value.failure?.message) ??
    "The payout failed."
  );
}

export function payoutFailureNpciCode(value: PayoutFailureFields): string | null {
  return value.status === "FAILED" ? presentText(value.npciCode) : null;
}

export function payoutProviderPublicCode(provider: PayoutProviderIdentity | undefined): string {
  return presentText(provider?.publicCode) ?? presentText(provider?.providerCode) ?? "";
}

export function payoutProviderPublicName(
  provider: PayoutProviderIdentity | null | undefined,
): string {
  return (
    presentText(provider?.publicName) ?? presentText(provider?.providerName) ?? "Payout provider"
  );
}
