import { authenticatedRequest } from "@/lib/auth-api";
import type { AuditPage, ProviderTransactionPage, WalletBalances } from "@/lib/operations-api";

export type HierarchyChild = {
  id?: string;
  childUserId?: string;
  parentUserId?: string;
  serviceType?: string;
  isActive?: boolean;
  createdAt?: string;
};

export const distributorApi = {
  balances: (identityId: string) =>
    authenticatedRequest<WalletBalances>(`/wallet/balances/${encodeURIComponent(identityId)}`),
  transactions: (query = "page=1&limit=50") =>
    authenticatedRequest<ProviderTransactionPage>(`/aeps/network-transactions?${query}`),
  retailers: (identityId: string) =>
    authenticatedRequest<HierarchyChild[]>(
      `/commission-hierarchy/parent/${encodeURIComponent(identityId)}/children`,
    ),
  audits: () => authenticatedRequest<AuditPage>("/audit/me?page=1&limit=50"),
  commissions: () => authenticatedRequest<unknown>("/commission-distributions/distributions"),
};
