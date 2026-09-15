import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, IndianRupee, Network, RefreshCw, Wallet } from "lucide-react";
import { AdminLayout, AdminPanel } from "@/components/admin/admin-layout";
import { getSession } from "@/lib/auth-api";
import { masterDistributorApi } from "@/lib/master-distributor-api";
import type { HierarchyChild } from "@/lib/distributor-api";
import type { ProviderTransactionPage, WalletBalances } from "@/lib/operations-api";
export const Route = createFileRoute("/master-distributor/dashboard")({
  component: MasterDashboard,
});
export function MasterDashboard() {
  const identityId = getSession()?.identity.id;
  const [wallet, setWallet] = useState<WalletBalances | null>(null),
    [children, setChildren] = useState<HierarchyChild[]>([]),
    [tx, setTx] = useState<ProviderTransactionPage | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");

  async function loadDashboard() {
    if (!identityId) return;
    setLoading(true);
    setError("");
    const [walletResult, hierarchyResult, transactionResult] = await Promise.allSettled([
      masterDistributorApi.balances(identityId),
      masterDistributorApi.distributors(identityId),
      masterDistributorApi.transactions(),
    ]);

    if (walletResult.status === "fulfilled") setWallet(walletResult.value);
    if (hierarchyResult.status === "fulfilled")
      setChildren(Array.isArray(hierarchyResult.value) ? hierarchyResult.value : []);
    if (transactionResult.status === "fulfilled") setTx(transactionResult.value);

    const failed = [walletResult, hierarchyResult, transactionResult].filter(
      (result) => result.status === "rejected",
    ).length;
    if (failed)
      setError(
        failed === 3
          ? "Live dashboard services are temporarily unavailable. Please retry."
          : `${failed} dashboard service${failed > 1 ? "s are" : " is"} temporarily unavailable; available data is shown below.`,
      );
    setLoading(false);
  }

  useEffect(() => {
    void loadDashboard();
    // The signed-in identity is the dashboard scope; other state must not restart loading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identityId]);
  const rows = tx?.data || [],
    success = rows.filter((x) => x.status === "SUCCESS"),
    volume = success.reduce((n, x) => n + Number(x.amount || 0), 0);
  const cards = [
    ["Total distributors", children.length, "Direct hierarchy", Network],
    ["Transactions", tx?.total || 0, `${success.length} successful`, Activity],
    [
      "Business volume",
      `₹${volume.toLocaleString("en-IN")}`,
      "Loaded network transactions",
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
      {error && (
        <div className="mb-5 flex items-center justify-between gap-4 rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadDashboard()}
            disabled={loading}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Retry
          </button>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([l, v, d, I]) => (
          <AdminPanel key={l}>
            <I className="text-primary" />
            <p className="mt-5 text-xs font-bold uppercase text-muted-foreground">{l}</p>
            <p className="mt-1 text-2xl font-black">{loading ? "—" : v}</p>
            <p className="mt-1 text-xs text-muted-foreground">{d}</p>
          </AdminPanel>
        ))}
      </div>
      <AdminPanel className="mt-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black">Recent AEPS activity</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Live hierarchy-scoped transactions from assigned Distributors and Retailers.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadDashboard()}
            disabled={loading}
            aria-label="Refresh dashboard"
            className="grid h-10 w-10 cursor-pointer place-items-center rounded-xl border border-border disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                <th className="p-3">Reference</th>
                <th className="p-3">Operation</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 8).map((row) => (
                <tr key={row.id || row.referenceId} className="border-b border-border/60">
                  <td className="p-3 font-bold">{row.referenceId}</td>
                  <td className="p-3">{row.operation}</td>
                  <td className="p-3">₹{Number(row.amount || 0).toLocaleString("en-IN")}</td>
                  <td className="p-3 font-bold">{row.status}</td>
                  <td className="p-3">{new Date(row.createdAt).toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !rows.length && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No AEPS transaction records are available for this network yet.
            </p>
          )}
        </div>
      </AdminPanel>
    </AdminLayout>
  );
}
