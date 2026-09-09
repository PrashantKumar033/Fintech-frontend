import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminLayout, AdminPanel } from "@/components/admin/admin-layout";
import { TransactionDetailDialog } from "@/components/transaction-detail-dialog";
import { getSession } from "@/lib/auth-api";
import { distributorApi } from "@/lib/distributor-api";
import type { ProviderTransactionPage, ProviderTransactionStatus } from "@/lib/operations-api";
export const Route = createFileRoute("/distributor/aeps/transactions")({
  component: DistributorTransactions,
});
function DistributorTransactions() {
  const [page, setPage] = useState<ProviderTransactionPage | null>(null),
    [status, setStatus] = useState<ProviderTransactionStatus | "">(""),
    [error, setError] = useState(""),
    [selectedReference, setSelectedReference] = useState<string | null>(null);
  const load = () => {
    setError("");
    distributorApi
      .transactions(`page=1&limit=50${status ? `&status=${status}` : ""}`)
      .then(setPage)
      .catch((e) => setError(e instanceof Error ? e.message : "Transactions could not be loaded."));
  };
  useEffect(load, [status]);
  return (
    <AdminLayout
      active="transactions"
      eyebrow="AEPS monitoring"
      title="Retailer AEPS transactions"
      description="Monitor available AEPS transaction records with status filters."
    >
      <AdminPanel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ProviderTransactionStatus | "")}
            className="rounded-xl border border-border px-4 py-3 text-sm"
          >
            <option value="">All statuses</option>
            {["SUCCESS", "FAILED", "PENDING", "PROCESSING", "REVERSED"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <button
            onClick={load}
            className="rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white"
          >
            Refresh
          </button>
        </div>
        {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-3">Reference</th>
                <th className="p-3">Operation</th>
                <th className="p-3">Provider</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {page?.data.map((row) => (
                <tr key={row.id} className="border-b border-border/60">
                  <td className="p-3"><button type="button" onClick={()=>setSelectedReference(row.referenceId)} className="font-bold text-primary hover:underline">{row.referenceId}</button></td>
                  <td className="p-3">{row.operation}</td>
                  <td className="p-3">{row.provider}</td>
                  <td className="p-3">₹{Number(row.amount).toLocaleString("en-IN")}</td>
                  <td className="p-3 font-bold">{row.status}</td>
                  <td className="p-3">{new Date(row.createdAt).toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!page?.data.length && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No matching transactions returned.
            </p>
          )}
        </div>
      </AdminPanel>
      <TransactionDetailDialog accessToken={getSession()?.accessToken || ""} referenceId={selectedReference} onClose={()=>setSelectedReference(null)}/>
    </AdminLayout>
  );
}
