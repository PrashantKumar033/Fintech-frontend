import { authenticatedRequest } from "@/lib/auth-api";
import type { AuditPage, ProviderTransactionPage, WalletBalances } from "@/lib/operations-api";
import type { HierarchyChild } from "@/lib/distributor-api";
export const masterDistributorApi = {
  balances: (id: string) =>
    authenticatedRequest<WalletBalances>(`/wallet/balances/${encodeURIComponent(id)}`),
  distributors: (id: string) =>
    authenticatedRequest<HierarchyChild[]>(
      `/commission-hierarchy/parent/${encodeURIComponent(id)}/children`,
    ),
  transactions: (query = "page=1&limit=50") =>
    authenticatedRequest<ProviderTransactionPage>(`/aeps/transactions?${query}`),
  audits: () => authenticatedRequest<AuditPage>("/audit/me?page=1&limit=50"),
  commissions: () => authenticatedRequest<unknown>("/commission-distributions/distributions"),
};
