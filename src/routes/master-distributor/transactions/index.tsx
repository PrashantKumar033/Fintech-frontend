import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminLayout, AdminPanel } from "@/components/admin/admin-layout";
import { TransactionDetailDialog } from "@/components/transaction-detail-dialog";
import { getSession } from "@/lib/auth-api";
import { masterDistributorApi } from "@/lib/master-distributor-api";
import type { ProviderTransactionPage, ProviderTransactionStatus } from "@/lib/operations-api";
export const Route = createFileRoute("/master-distributor/transactions/")({ component: Page });
function Page() {
  const initialStatus = (
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("status") : ""
  ) as ProviderTransactionStatus | "";
  const [page, setPage] = useState<ProviderTransactionPage | null>(null),
    [status, setStatus] = useState<ProviderTransactionStatus | "">(initialStatus),
    [error, setError] = useState(""),
    [selectedReference, setSelectedReference] = useState<string | null>(null);
  const load = () => {
    setError("");
    masterDistributorApi
      .transactions(`page=1&limit=50${status ? `&status=${status}` : ""}`)
      .then(setPage)
      .catch((e) => setError(e instanceof Error ? e.message : "Transactions unavailable."));
  };
  useEffect(load, [status]);
  return (
    <AdminLayout
      active="transactions"
      eyebrow="Monitoring"
      title="Transaction monitoring"
      description="Transactions returned for the authenticated Master Distributor scope."
    >
      <AdminPanel>
        <p className="mb-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
          The current endpoint does not provide verified downstream Distributor/Retailer
          aggregation, so this view never claims network-wide coverage.
        </p>
        <div className="flex flex-wrap justify-between gap-3">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ProviderTransactionStatus | "")}
            className="rounded-xl border px-4 py-3 text-sm"
          >
            <option value="">All statuses</option>
            {["SUCCESS", "FAILED", "PENDING", "PROCESSING", "REVERSED"].map((v) => (
              <option key={v}>{v}</option>
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
              {page?.data.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="p-3"><button type="button" onClick={()=>setSelectedReference(r.referenceId)} className="font-bold text-primary hover:underline">{r.referenceId}</button></td>
                  <td className="p-3">{r.operation}</td>
                  <td className="p-3">{r.provider}</td>
                  <td className="p-3">₹{Number(r.amount).toLocaleString("en-IN")}</td>
                  <td className="p-3 font-bold">{r.status}</td>
                  <td className="p-3">{new Date(r.createdAt).toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!page?.data.length && !error && (
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
