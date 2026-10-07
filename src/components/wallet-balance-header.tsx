import { CircleDollarSign, Fingerprint, Wallet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Identity, WalletBalanceValue } from "@/lib/auth-api";
import { walletApi } from "@/lib/wallet-api";
import { adminApi } from "@/lib/admin-api";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatBalance(value: WalletBalanceValue | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) return currency.format(value);
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[₹,\s]/g, ""));
    if (Number.isFinite(parsed)) return currency.format(parsed);
  }
  return "—";
}

function isSuperAdmin(role: string) {
  return (
    role
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, "_") === "SUPER_ADMIN"
  );
}

export function WalletBalanceHeader({ identity, role }: { identity?: Identity; role?: string }) {
  const walletRole = role || identity?.role || "";
  const superAdmin = isSuperAdmin(walletRole);
  const balanceQuery = useQuery({
    queryKey: ["wallet-balances", identity?.id || "super-admin", walletRole],
    queryFn: () =>
      superAdmin ? adminApi.operations.walletBalances() : walletApi.getBalances(walletRole),
    enabled: Boolean(walletRole),
    staleTime: 15_000,
    refetchInterval: 30_000,
    retry: 1,
  });
  const balances = balanceQuery.data?.wallets ?? identity?.walletBalances;
  const items = [
    {
      label: "Main wallet",
      value: balances?.mainAvailable ?? balances?.main ?? identity?.mainWalletBalance,
      icon: Wallet,
    },
    {
      label: "AEPS wallet",
      value: balances?.aeps ?? identity?.aepsWalletBalance,
      icon: Fingerprint,
    },
    {
      label: "Profit wallet",
      value: balances?.profit ?? identity?.profitWalletBalance,
      icon: CircleDollarSign,
    },
  ] as const;

  return (
    <div
      className="grid min-w-0 grid-cols-3 gap-1.5 sm:gap-2"
      aria-label="Wallet balances"
      title={balanceQuery.isError ? "Wallet balances could not be refreshed" : undefined}
    >
      {items.map(({ label, value, icon: Icon }) => (
        <div
          key={label}
          className="flex min-w-0 items-center gap-2 rounded-xl border border-border bg-background px-2.5 py-1.5 sm:min-w-28 sm:px-3"
        >
          <Icon size={15} className="hidden shrink-0 text-primary sm:block" />
          <div className="min-w-0">
            <p className="truncate text-[8px] font-bold uppercase tracking-wide text-muted-foreground sm:text-[9px]">
              {label}
            </p>
            <p className="truncate text-xs font-extrabold text-secondary sm:text-sm">
              {formatBalance(value)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
