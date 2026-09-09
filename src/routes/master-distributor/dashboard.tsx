import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, IndianRupee, Network, Wallet } from "lucide-react";
import { AdminLayout, AdminPanel } from "@/components/admin/admin-layout";
import { getSession } from "@/lib/auth-api";
import { masterDistributorApi } from "@/lib/master-distributor-api";
import type { HierarchyChild } from "@/lib/distributor-api";
import type { ProviderTransactionPage, WalletBalances } from "@/lib/operations-api";
export const Route = createFileRoute("/master-distributor/dashboard")({
  component: MasterDashboard,
});
export function MasterDashboard() {
  const s = getSession(),
    [wallet, setWallet] = useState<WalletBalances | null>(null),
    [children, setChildren] = useState<HierarchyChild[]>([]),
    [tx, setTx] = useState<ProviderTransactionPage | null>(null);
  useEffect(() => {
    if (!s) return;
    Promise.allSettled([
      masterDistributorApi.balances(s.identity.id),
      masterDistributorApi.distributors(s.identity.id),
      masterDistributorApi.transactions(),
    ]).then(([a, b, c]) => {
      if (a.status === "fulfilled") setWallet(a.value);
      if (b.status === "fulfilled") setChildren(Array.isArray(b.value) ? b.value : []);
      if (c.status === "fulfilled") setTx(c.value);
    });
  }, [s?.identity.id]);
  const rows = tx?.data || [],
    success = rows.filter((x) => x.status === "SUCCESS"),
    volume = success.reduce((n, x) => n + Number(x.amount || 0), 0);
  const cards = [
    ["Total distributors", children.length, "Direct hierarchy", Network],
    ["Transactions", tx?.total || 0, `${success.length} successful`, Activity],
    [
      "Business volume",
      `₹${volume.toLocaleString("en-IN")}`,
      "Available transaction scope",
      IndianRupee,
    ],
    [
      "Wallet balance",
      `₹${Number(wallet?.wallets.main || 0).toLocaleString("en-IN")}`,
      `Profit ₹${Number(wallet?.wallets.profit || 0).toLocaleString("en-IN")}`,
      Wallet,
    ],
  ] as const;
  return (
    <AdminLayout
      active="dashboard"
      eyebrow="Network command center"
      title="Master Distributor dashboard"
      description="Manage Distributor hierarchy and monitor available wallet and transaction services."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([l, v, d, I]) => (
          <AdminPanel key={l}>
            <I className="text-primary" />
            <p className="mt-5 text-xs font-bold uppercase text-muted-foreground">{l}</p>
            <p className="mt-1 text-2xl font-black">{v}</p>
            <p className="mt-1 text-xs text-muted-foreground">{d}</p>
          </AdminPanel>
        ))}
      </div>
      <AdminPanel className="mt-6">
        <h2 className="text-xl font-black">Network visibility</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Direct Distributor hierarchy is live. Recursive Retailer totals and downstream business
          summaries will populate after scoped backend aggregation endpoints are available.
        </p>
      </AdminPanel>
    </AdminLayout>
  );
}
