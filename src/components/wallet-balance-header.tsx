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
      tone: "border-emerald-200 bg-emerald-50/80 text-emerald-700",
    },
    {
      label: "AEPS wallet",
      value: balances?.aeps ?? identity?.aepsWalletBalance,
      icon: Fingerprint,
      tone: "border-orange-200 bg-orange-50/80 text-orange-700",
    },
    {
      label: "Profit wallet",
      value: balances?.profit ?? identity?.profitWalletBalance,
      icon: CircleDollarSign,
      tone: "border-violet-200 bg-violet-50/80 text-violet-700",
    },
  ] as const;

  const balanceText = (value: WalletBalanceValue | undefined) => {
    if (value !== undefined && value !== null) return formatBalance(value);
    if (balanceQuery.isPending) return "Loading…";
    if (balanceQuery.isError) return "Unavailable";
    return formatBalance(value);
  };

  return (
    <div
      className="grid w-full min-w-0 grid-cols-3 gap-1.5 sm:gap-2"
      aria-label="Wallet balances"
      title={balanceQuery.isError ? "Wallet balances could not be refreshed" : undefined}
    >
      {items.map(({ label, value, icon: Icon, tone }) => (
        <div
          key={label}
          className={`flex min-h-[52px] min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 shadow-sm sm:px-3 ${tone}`}
        >
          <Icon size={16} className="hidden shrink-0 sm:block" />
          <div className="min-w-0">
            <p className="truncate text-[8px] font-black uppercase tracking-wide sm:text-[9px]">
              {label}
            </p>
            <p className="truncate text-[11px] font-black tabular-nums text-secondary sm:text-sm">
              {balanceText(value)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
