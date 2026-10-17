import type { WalletBalanceValue } from "./auth-api";

export type WalletBalanceInput = WalletBalanceValue | undefined;

const walletCurrency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function parseWalletBalance(value: WalletBalanceInput): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !value.trim()) return null;

  const parsed = Number(value.replace(/[₹,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatWalletBalance(value: WalletBalanceInput, fallback = "—"): string {
  const parsed = parseWalletBalance(value);
  if (parsed === null) return fallback;
  return walletCurrency.format(parsed === 0 ? 0 : parsed);
}

export function isNegativeWalletBalance(value: WalletBalanceInput): boolean {
  const parsed = parseWalletBalance(value);
  return parsed !== null && parsed < 0;
}
