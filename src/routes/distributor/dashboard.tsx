import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, IndianRupee, Store, Wallet } from "lucide-react";
import { AdminLayout, AdminPanel } from "@/components/admin/admin-layout";
import { getSession } from "@/lib/auth-api";
import { distributorApi, type HierarchyChild } from "@/lib/distributor-api";
import type { ProviderTransactionPage, WalletBalances } from "@/lib/operations-api";

export const Route = createFileRoute("/distributor/dashboard")({ component: DistributorDashboard });

export function DistributorDashboard() {
  const session = getSession();
  const [balances, setBalances] = useState<WalletBalances | null>(null);
  const [transactions, setTransactions] = useState<ProviderTransactionPage | null>(null);
  const [retailers, setRetailers] = useState<HierarchyChild[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!session) return;
    Promise.allSettled([distributorApi.balances(session.identity.id), distributorApi.transactions("page=1&limit=50"), distributorApi.retailers(session.identity.id)]).then(([walletResult, transactionResult, retailerResult]) => {
      if (walletResult.status === "fulfilled") setBalances(walletResult.value);
      if (transactionResult.status === "fulfilled") setTransactions(transactionResult.value);
      if (retailerResult.status === "fulfilled") setRetailers(Array.isArray(retailerResult.value) ? retailerResult.value : []);
      if ([walletResult, transactionResult, retailerResult].every(result => result.status === "rejected")) setError("Live distributor summaries are temporarily unavailable.");
    });
  }, [session?.identity.id]);
  const rows = transactions?.data || [];
  const successful = rows.filter(row => row.status === "SUCCESS");
  const volume = successful.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const cards = [
    ["Total retailers", String(retailers.length), "Hierarchy API", Store],
    ["Transactions", String(transactions?.total ?? rows.length), `${successful.length} successful`, Activity],
    ["Business volume", `₹${volume.toLocaleString("en-IN")}`, "Successful transactions", IndianRupee],
    ["Wallet balance", `₹${Number(balances?.wallets.main || 0).toLocaleString("en-IN")}`, `Profit ₹${Number(balances?.wallets.profit || 0).toLocaleString("en-IN")}`, Wallet],
  ] as const;
  return <AdminLayout active="dashboard" eyebrow="Distributor network" title="Distributor dashboard" description="Retailer network, transaction and wallet summaries from available backend services.">{error && <p className="mb-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{error}</p>}<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label,value,detail,Icon]) => <AdminPanel key={label}><Icon className="text-primary"/><p className="mt-5 text-xs font-bold uppercase text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-black">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></AdminPanel>)}</div><AdminPanel className="mt-6"><h2 className="text-xl font-black">Recent AEPS activity</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead><tr className="border-b"><th className="p-3">Reference</th><th className="p-3">Service</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3">Date</th></tr></thead><tbody>{rows.slice(0,8).map(row => <tr key={row.id} className="border-b border-border/60"><td className="p-3 font-bold">{row.referenceId}</td><td className="p-3">{row.operation}</td><td className="p-3">₹{Number(row.amount).toLocaleString("en-IN")}</td><td className="p-3 font-bold">{row.status}</td><td className="p-3">{new Date(row.createdAt).toLocaleDateString("en-IN")}</td></tr>)}</tbody></table>{!rows.length && <p className="py-10 text-center text-sm text-muted-foreground">No transaction records returned yet.</p>}</div></AdminPanel></AdminLayout>;
}
