import { authenticatedRequest, type WalletBalanceValue } from "@/lib/auth-api";

export type WalletBalances = {
  main: WalletBalanceValue;
  mainHeld?: WalletBalanceValue;
  mainAvailable?: WalletBalanceValue;
  aeps: WalletBalanceValue;
  profit: WalletBalanceValue;
};

type WalletBalancesResponse = {
  userId: string;
  wallets: WalletBalances;
};

function isSuperAdmin(role: string) {
  const normalizedRole = role
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
  return normalizedRole === "SUPER_ADMIN" || normalizedRole === "SUPERADMIN";
}

export const walletApi = {
  getBalances: (role: string) =>
    authenticatedRequest<WalletBalancesResponse>(
      isSuperAdmin(role) ? "/super-admin/wallet/balances" : "/wallet/balances",
      { method: "GET" },
    ),
};
