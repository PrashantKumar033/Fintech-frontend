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

export function WalletBalanceHeader({
  identity,
  role,
  compact = false,
}: {
  identity?: Identity;
  role?: string;
  compact?: boolean;
}) {
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
      cardClass: "border-emerald-200/80 bg-emerald-50/65 shadow-emerald-100/70",
      iconClass: "bg-gradient-to-br from-emerald-500 to-teal-700 text-white",
    },
    {
      label: "AEPS wallet",
      value: balances?.aeps ?? identity?.aepsWalletBalance,
      icon: Fingerprint,
      cardClass: "border-orange-200/80 bg-orange-50/65 shadow-orange-100/70",
      iconClass: "bg-gradient-to-br from-orange-400 to-orange-600 text-white",
    },
    {
      label: "Profit wallet",
      value: balances?.profit ?? identity?.profitWalletBalance,
      icon: CircleDollarSign,
      cardClass: "border-emerald-200/80 bg-emerald-50/65 shadow-emerald-100/70",
      iconClass: "bg-gradient-to-br from-teal-500 to-teal-700 text-white",
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
      className={`grid min-w-0 ${compact ? "grid-cols-1 gap-2" : "grid-cols-3 gap-1.5 sm:gap-2.5"}`}
      aria-label="Wallet balances"
      title={balanceQuery.isError ? "Wallet balances could not be refreshed" : undefined}
    >
      {items.map(({ label, value, icon: Icon, cardClass, iconClass }) => (
        <div
          key={label}
          className={`flex min-w-0 items-center gap-1.5 rounded-2xl border p-1.5 shadow-sm sm:gap-2 sm:pr-2 ${compact ? "w-full" : "sm:min-w-36"} ${cardClass}`}
        >
          <span
            className={`${compact ? "grid" : "hidden sm:grid"} h-9 w-9 shrink-0 place-items-center rounded-xl shadow-sm lg:h-10 lg:w-10 ${iconClass}`}
          >
            <Icon size={19} strokeWidth={2.1} />
          </span>
          <div className="min-w-0 flex-1 px-0.5">
            <p className="truncate text-[7px] font-black uppercase tracking-[0.08em] text-muted-foreground sm:text-[8px] lg:text-[9px]">
              {label}
            </p>
            <p className="truncate text-[10px] font-black tabular-nums text-secondary sm:text-xs lg:text-[15px]">
              {balanceText(value)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
