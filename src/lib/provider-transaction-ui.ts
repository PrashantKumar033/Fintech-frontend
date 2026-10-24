export type ProviderStatusFields = {
  statusDescription?: string | null;
  npciMessage?: string | null;
  providerStatusMessage?: string | null;
  reconciliationReason?: string | null;
  status?: string | null;
  needsReconciliation?: boolean;
  recoveryComplete?: boolean;
};

function firstText(values: Array<string | null | undefined>): string | undefined {
  for (const value of values) {
    const text = value?.trim();
    if (text) return text;
  }
  return undefined;
}

export function directAepsTransactionMessage(
  item: Pick<ProviderStatusFields, "npciMessage" | "statusDescription">,
  genericMessage?: string | null,
): string {
  return (
    firstText([item.npciMessage, item.statusDescription, genericMessage]) ?? "Response received"
  );
}

export function providerTransactionReason(item: ProviderStatusFields): string {
  return firstText([item.statusDescription, item.npciMessage, item.reconciliationReason]) ?? "—";
}

export function providerTransactionDescription(item: ProviderStatusFields): string {
  const reason = providerTransactionReason(item);
  return reason !== "—" ? reason : (firstText([item.status]) ?? "—");
}

export function canResolveProviderTransaction(item: ProviderStatusFields): boolean {
  const status = item.status?.trim().toUpperCase();
  return item.needsReconciliation === true && (status === "PENDING" || status === "UNKNOWN");
}

export function canRecoverProviderFinancialEffects(item: ProviderStatusFields): boolean {
  const status = item.status?.trim().toUpperCase();
  return (
    item.recoveryComplete !== true &&
    item.needsReconciliation === true &&
    (status === "SUCCESS" || status === "FAILED")
  );
}

export function financialRecoveryRequestInit(): RequestInit {
  return { method: "POST" };
}

export function buildFinancialRecoveryPath(referenceId: string): string {
  return `/admin/transactions/reconciliation/${encodeURIComponent(referenceId.trim())}/recover-financial-effects`;
}
