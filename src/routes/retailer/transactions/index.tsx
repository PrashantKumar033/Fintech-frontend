import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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

const allowedStatuses = new Set<ProviderTransactionStatus>([
  "INITIATED",
  "PROCESSING",
  "SUCCESS",
  "FAILED",
  "PENDING",
  "UNKNOWN",
  "REVERSED",
]);

export const Route = createFileRoute("/retailer/transactions/")({
  validateSearch: (search: Record<string, unknown>) => ({
    status:
      typeof search.status === "string" &&
      allowedStatuses.has(search.status as ProviderTransactionStatus)
        ? (search.status as ProviderTransactionStatus)
        : undefined,
  }),
  head: () => ({ meta: [{ title: "Transaction History — UMOBIPAY" }] }),
  component: TransactionsPage,
});

function TransactionsPage() {
  const { status: routeStatus } = Route.useSearch();
  const status = routeStatus ?? "";
  const navigate = useNavigate();
  const [session, setSession] = useState<ReturnType<typeof getSession>>(null);
  const [page, setPage] = useState<ProviderTransactionPage | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedReference, setSelectedReference] = useState<string | null>(null);
  const load = useCallback(
    async (token: string, selectedStatus: ProviderTransactionStatus | "") => {
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
    },
    [],
  );
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
  }, [navigate]);
  useEffect(() => {
    if (!session) return;
    void load(session.accessToken, status);
  }, [load, session, status]);
  const rows = useMemo(
    () =>
      (page?.data ?? []).filter((item) =>
        `${item.referenceId} ${item.serviceType || "AEPS"} ${item.provider} ${item.operation} ${item.rrn ?? ""}`
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
      "Reference,Service,Provider,Operation,Amount,Commission,Commission Status,Status,RRN,Created",
      ...rows.map((row) =>
        [
          row.referenceId,
          row.serviceType || "AEPS",
          row.provider,
          row.operation,
          row.amount,
          row.commissionAmount ?? "",
          row.commissionStatus ?? "",
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
              void navigate({
                to: "/retailer/transactions",
                search: value ? { status: value } : {},
              });
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
            <table className="w-full min-w-[1050px] text-left">
              <thead>
                <tr className="bg-muted text-[10px] uppercase text-muted-foreground">
                  {[
                    "Reference",
                    "Service",
                    "Provider",
                    "Operation",
                    "Amount",
                    "Commission",
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
                  <tr key={row.id || row.referenceId} className="border-t border-border text-xs">
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => setSelectedReference(row.referenceId)}
                        className="font-bold text-primary hover:underline"
                      >
                        {row.referenceId}
                      </button>
                    </td>
                    <td className="px-5 py-4">{row.serviceType || "AEPS"}</td>
                    <td className="px-5 py-4">{row.provider}</td>
                    <td className="px-5 py-4">{operationLabel(row.operation)}</td>
                    <td className="px-5 py-4 font-extrabold">
                      ₹{Number(row.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-extrabold text-secondary">
                        {row.commissionAmount !== null && row.commissionAmount !== undefined
                          ? new Intl.NumberFormat("en-IN", {
                              style: "currency",
                              currency: "INR",
                            }).format(Number(row.commissionAmount))
                          : "—"}
                      </p>
                      <p className="mt-1 text-[10px] font-semibold text-muted-foreground">
                        {commissionLabel(row.commissionStatus)}
                      </p>
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

function commissionLabel(status?: string) {
  if (!status) return "Status unavailable";
  if (status === "SETTLED") return "Credited";
  if (status === "NOT_REQUIRED") return "Not applicable";
  return status.replaceAll("_", " ").toLowerCase();
}
