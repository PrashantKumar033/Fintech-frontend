export type ProviderStatusFields = {
  statusDescription?: string | null;
  npciMessage?: string | null;
  providerStatusMessage?: string | null;
  reconciliationReason?: string | null;
  status?: string | null;
  needsReconciliation?: boolean;
  recoveryComplete?: boolean;
};

export function providerTransactionDescription(item: ProviderStatusFields): string {
  for (const value of [
    item.statusDescription,
    item.npciMessage,
    item.providerStatusMessage,
    item.reconciliationReason,
    item.status,
  ]) {
    const description = value?.trim();
    if (description) return description;
  }
  return "—";
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
