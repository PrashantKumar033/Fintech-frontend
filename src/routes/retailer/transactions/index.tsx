import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Download, Receipt, RefreshCw, Search } from "lucide-react";
import { BusinessPage, ServiceNotice } from "@/components/business-page";
import { TransactionDetailDialog } from "@/components/transaction-detail-dialog";
import { getSession } from "@/lib/auth-api";
import { credentialsPending, signedInHome } from "@/lib/role-hierarchy";
import {
  operationsApi,
  operationsMessage,
  type ProviderTransactionPage,
  type ProviderTransactionStatus,
} from "@/lib/operations-api";

export const Route = createFileRoute("/retailer/transactions/")({
  head: () => ({ meta: [{ title: "Transaction History — UMOBIPAY" }] }),
  component: TransactionsPage,
});

function TransactionsPage() {
  const initialStatus = (
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("status") : ""
  ) as ProviderTransactionStatus | "";
  const navigate = useNavigate();
  const [session, setSession] = useState<ReturnType<typeof getSession>>(null);
  const [page, setPage] = useState<ProviderTransactionPage | null>(null);
  const [status, setStatus] = useState<ProviderTransactionStatus | "">(initialStatus);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedReference, setSelectedReference] = useState<string | null>(null);
  async function load(token: string, selectedStatus = status) {
    setLoading(true);
    setError("");
    try {
      setPage(
        await operationsApi.transactions(token, {
          page: 1,
          limit: 50,
          status: selectedStatus || undefined,
        }),
      );
    } catch (e) {
      setError(operationsMessage(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    const value = getSession();
    if (!value) {
      void navigate({ to: "/login" });
      return;
    }
    if (credentialsPending(value.identity)) {
      window.location.replace(signedInHome(value));
      return;
    }
    setSession(value);
    void load(value.accessToken, initialStatus);
  }, [navigate]);
  const rows = useMemo(
    () =>
      (page?.data ?? []).filter((item) =>
        `${item.referenceId} ${item.provider} ${item.operation} ${item.rrn ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [page, query],
  );
  if (!session)
    return (
      <div className="grid min-h-screen place-items-center">
        <RefreshCw className="animate-spin text-primary" />
      </div>
    );
  function exportCsv() {
    const csv = [
      "Reference,Provider,Operation,Amount,Status,RRN,Created",
      ...rows.map((row) =>
        [
          row.referenceId,
          row.provider,
          row.operation,
          row.amount,
          row.status,
          row.rrn ?? "",
          row.createdAt,
        ]
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "umobipay-transactions.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return (
    <BusinessPage
      identity={session.identity}
      active="transactions"
      eyebrow="Transaction service"
      title="Transaction history"
      description="Track AEPS provider operations, response status, references and reconciliation indicators."
    >
      {error && (
        <div className="mb-5">
          <ServiceNotice ok={false}>{error}</ServiceNotice>
        </div>
      )}
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <div className="flex flex-wrap gap-3 border-b border-border p-5">
          <label className="flex min-w-56 flex-1 items-center gap-2 rounded-xl border border-border bg-background px-4">
            <Search size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search reference, provider or RRN"
              className="w-full bg-transparent py-3 text-sm outline-none"
            />
          </label>
          <select
            value={status}
            onChange={(e) => {
              const value = e.target.value as ProviderTransactionStatus | "";
              setStatus(value);
              void load(session.accessToken, value);
            }}
            className="rounded-xl border border-border bg-background px-4 text-sm"
          >
            <option value="">All statuses</option>
            {["INITIATED", "PROCESSING", "SUCCESS", "FAILED", "PENDING", "UNKNOWN", "REVERSED"].map(
              (value) => (
                <option key={value}>{value}</option>
              ),
            )}
          </select>
          <button
            onClick={exportCsv}
            disabled={!rows.length}
            className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-3 text-xs font-bold text-white disabled:opacity-40"
          >
            <Download size={15} /> Export
          </button>
        </div>
        {loading ? (
          <div className="grid h-64 place-items-center">
            <RefreshCw className="animate-spin text-primary" />
          </div>
        ) : rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="bg-muted text-[10px] uppercase text-muted-foreground">
                  {[
                    "Reference",
                    "Service",
                    "Provider",
                    "Operation",
                    "Amount",
                    "Status",
                    "RRN",
                    "Created",
                  ].map((h) => (
                    <th key={h} className="px-5 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-border text-xs">
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => setSelectedReference(row.referenceId)}
                        className="font-bold text-primary hover:underline"
                      >
                        {row.referenceId}
                      </button>
                    </td>
                    <td className="px-5 py-4">{row.serviceType}</td>
                    <td className="px-5 py-4">{row.provider}</td>
                    <td className="px-5 py-4">{operationLabel(row.operation)}</td>
                    <td className="px-5 py-4 font-extrabold">
                      ₹{Number(row.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${row.status === "SUCCESS" ? "bg-emerald-50 text-emerald-700" : row.status === "FAILED" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">{row.rrn || "—"}</td>
                    <td className="px-5 py-4">{new Date(row.createdAt).toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid h-64 place-items-center text-center">
            <div>
              <Receipt className="mx-auto text-muted-foreground" />
              <p className="mt-3 font-bold text-secondary">No transactions found</p>
              <p className="text-sm text-muted-foreground">
                Completed AEPS activity will appear here.
              </p>
            </div>
          </div>
        )}
        <div className="border-t border-border p-4 text-xs text-muted-foreground">
          {page?.total ?? 0} total provider transactions
        </div>
      </section>
      <TransactionDetailDialog
        accessToken={session.accessToken}
        referenceId={selectedReference}
        onClose={() => setSelectedReference(null)}
      />
    </BusinessPage>
  );
}
function operationLabel(value: string) {
  return (
    (
      {
        BE: "Balance enquiry",
        MS: "Mini statement",
        CW: "Cash withdrawal",
        AP: "Aadhaar Pay",
        CD: "Cash deposit",
      } as Record<string, string>
    )[value] || value
  );
}
