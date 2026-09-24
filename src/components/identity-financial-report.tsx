import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Download, LoaderCircle, RefreshCw } from "lucide-react";
import { AdminLayout, AdminPanel } from "@/components/admin/admin-layout";
import { BusinessPage } from "@/components/business-page";
import { getSession } from "@/lib/auth-api";
import {
  operationsApi,
  operationsMessage,
  type TransactionLedgerFilters,
  type TransactionLedgerReportPage,
  type TransactionLedgerSummary,
} from "@/lib/operations-api";
import { resolveWorkspaceRole } from "@/lib/role-hierarchy";

const initialFilters = {
  walletType: "",
  type: "",
  status: "",
  serviceType: "",
  fromDate: "",
  toDate: "",
};

type ReportView = "all" | "credits" | "debits" | "main" | "aeps" | "profit";

const reportField =
  "min-h-12 w-full rounded-xl border border-border bg-[#f1f8f6] px-4 py-3 text-sm font-medium text-secondary outline-none transition placeholder:text-muted-foreground focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10";

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
});

function toApiFilters(filters: typeof initialFilters): TransactionLedgerFilters {
  return {
    walletType: (filters.walletType || undefined) as TransactionLedgerFilters["walletType"],
    type: (filters.type || undefined) as TransactionLedgerFilters["type"],
    status: (filters.status || undefined) as TransactionLedgerFilters["status"],
    serviceType: filters.serviceType.trim() || undefined,
    fromDate: filters.fromDate || undefined,
    toDate: filters.toDate || undefined,
  };
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function IdentityFinancialReport({ embedded = false }: { embedded?: boolean } = {}) {
  const session = getSession();
  const [filters, setFilters] = useState(initialFilters);
  const [applied, setApplied] = useState(initialFilters);
  const [page, setPage] = useState<TransactionLedgerReportPage | null>(null);
  const [summary, setSummary] = useState<TransactionLedgerSummary | null>(null);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reportView, setReportView] = useState<ReportView>("all");

  const load = useCallback(
    async (cursor?: string, nextFilters = applied) => {
      if (!session) return;
      setLoading(true);
      setError("");
      try {
        const apiFilters = toApiFilters(nextFilters);
        const [ledger, totals] = await Promise.all([
          operationsApi.transactionLedgerReport(session.accessToken, {
            ...apiFilters,
            limit: 50,
            cursor,
          }),
          operationsApi.transactionLedgerSummary(session.accessToken, apiFilters),
        ]);
        setPage(ledger);
        setSummary(totals);
        setCurrentCursor(cursor);
      } catch (caught) {
        setError(operationsMessage(caught));
      } finally {
        setLoading(false);
      }
    },
    [applied, session],
  );

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.identity.id]);

  if (!session) {
    return (
      <div className="grid min-h-screen place-items-center">
        <LoaderCircle className="animate-spin" />
      </div>
    );
  }

  function apply(event: FormEvent) {
    event.preventDefault();
    if (filters.fromDate && filters.toDate && filters.fromDate > filters.toDate) {
      setError("From date cannot be after To date.");
      return;
    }
    setReportView(
      filters.type === "CREDIT"
        ? "credits"
        : filters.type === "DEBIT"
          ? "debits"
          : filters.walletType === "MAIN"
            ? "main"
            : filters.walletType === "AEPS"
              ? "aeps"
              : filters.walletType === "PROFIT"
                ? "profit"
                : "all",
    );
    setApplied(filters);
    setCursorHistory([]);
    void load(undefined, filters);
  }

  function switchReportView(nextView: ReportView) {
    const next = {
      ...filters,
      walletType:
        nextView === "main"
          ? "MAIN"
          : nextView === "aeps"
            ? "AEPS"
            : nextView === "profit"
              ? "PROFIT"
              : "",
      type: nextView === "credits" ? "CREDIT" : nextView === "debits" ? "DEBIT" : "",
    };
    setReportView(nextView);
    setFilters(next);
    setApplied(next);
    setCursorHistory([]);
    void load(undefined, next);
  }

  function exportCsv() {
    if (!page?.data.length) return;
    const header = [
      "Date",
      "Reference",
      "Title",
      "Service",
      "Wallet",
      "Type",
      "Amount",
      "Opening balance",
      "Closing balance",
      "Status",
    ];
    const rows = page.data.map((item) => [
      item.createdAt,
      item.referenceId,
      item.title,
      item.serviceType,
      item.walletType,
      item.type,
      item.amount,
      item.openingBalance,
      item.closingBalance,
      item.status,
    ]);
    const blob = new Blob([[header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `umobipay-financial-report-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const content = (
    <>
      {error ? (
        <p
          role="alert"
          className="mb-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700"
        >
          {error}
        </p>
      ) : null}
      <div className="mb-5 overflow-x-auto rounded-2xl border border-border bg-white p-2 shadow-sm">
        <div className="flex min-w-max gap-2">
          {(
            [
              ["all", "All transactions"],
              ["credits", "Credits"],
              ["debits", "Debits"],
              ["main", "MAIN wallet"],
              ["aeps", "AEPS wallet"],
              ["profit", "Profit wallet"],
            ] as Array<[ReportView, string]>
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => switchReportView(value)}
              disabled={loading}
              className={`rounded-xl px-4 py-2.5 text-sm font-extrabold transition disabled:opacity-50 ${
                reportView === value
                  ? "bg-primary text-white shadow-sm"
                  : "text-secondary hover:bg-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Transactions", String(summary?.totalTransactions ?? 0)],
          ["Total credits", money.format(Number(summary?.totalCreditAmount || 0))],
          ["Total debits", money.format(Number(summary?.totalDebitAmount || 0))],
          ["Net movement", money.format(Number(summary?.netMovement || 0))],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-black text-secondary">
              {loading && !summary ? "—" : value}
            </p>
          </div>
        ))}
      </div>

      <AdminPanel className="mt-5">
        <form onSubmit={apply} className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          <select
            value={filters.walletType}
            onChange={(event) => setFilters({ ...filters, walletType: event.target.value })}
            className={reportField}
          >
            <option value="">All wallets</option>
            <option>MAIN</option>
            <option>AEPS</option>
            <option>PROFIT</option>
          </select>
          <select
            value={filters.type}
            onChange={(event) => setFilters({ ...filters, type: event.target.value })}
            className={reportField}
          >
            <option value="">Credit &amp; debit</option>
            <option>CREDIT</option>
            <option>DEBIT</option>
          </select>
          <select
            value={filters.status}
            onChange={(event) => setFilters({ ...filters, status: event.target.value })}
            className={reportField}
          >
            <option value="">All statuses</option>
            {["PENDING", "PROCESSING", "SUCCESS", "FAILED", "REVERSED", "REFUNDED"].map(
              (status) => (
                <option key={status}>{status}</option>
              ),
            )}
          </select>
          <input
            value={filters.serviceType}
            onChange={(event) => setFilters({ ...filters, serviceType: event.target.value })}
            placeholder="Service type"
            className={reportField}
          />
          <input
            type="date"
            value={filters.fromDate}
            onChange={(event) => setFilters({ ...filters, fromDate: event.target.value })}
            className={reportField}
            aria-label="From date"
          />
          <input
            type="date"
            value={filters.toDate}
            onChange={(event) => setFilters({ ...filters, toDate: event.target.value })}
            className={reportField}
            aria-label="To date"
          />
          <button
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Apply
          </button>
        </form>
        <div className="mt-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-black text-secondary">Financial ledger</h2>
            <p className="text-xs text-muted-foreground">
              Backend transaction-ledger report for the signed-in account.
            </p>
          </div>
          <button
            type="button"
            onClick={exportCsv}
            disabled={!page?.data.length}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-extrabold disabled:opacity-40"
          >
            <Download size={15} /> Export CSV
          </button>
        </div>
        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Reference</th>
                <th className="p-3">Service</th>
                <th className="p-3">Wallet</th>
                <th className="p-3">Type</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Opening</th>
                <th className="p-3">Closing</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {page?.data.map((item) => (
                <tr
                  key={`${item.sequence}-${item.referenceId}`}
                  className="border-t border-border/70"
                >
                  <td className="whitespace-nowrap p-3">
                    {new Date(item.createdAt).toLocaleString("en-IN")}
                  </td>
                  <td className="p-3">
                    <p className="font-mono text-xs">{item.referenceId}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.title}</p>
                  </td>
                  <td className="p-3">{item.serviceType}</td>
                  <td className="p-3 font-bold">{item.walletType}</td>
                  <td
                    className={`p-3 font-bold ${item.type === "CREDIT" ? "text-emerald-700" : "text-red-600"}`}
                  >
                    {item.type}
                  </td>
                  <td className="p-3 font-bold">{money.format(Number(item.amount))}</td>
                  <td className="p-3">{money.format(Number(item.openingBalance))}</td>
                  <td className="p-3">{money.format(Number(item.closingBalance))}</td>
                  <td className="p-3 font-bold">{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !page?.data.length ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No transactions match the selected report filters.
            </p>
          ) : null}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            disabled={!cursorHistory.length || loading}
            onClick={() => {
              const history = [...cursorHistory];
              const previous = history.pop();
              setCursorHistory(history);
              void load(previous);
            }}
            className="rounded-xl border border-border px-4 py-2 text-xs font-bold disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={!page?.hasNext || !page.nextCursor || loading}
            onClick={() => {
              setCursorHistory([...cursorHistory, currentCursor || ""]);
              void load(page?.nextCursor || undefined);
            }}
            className="rounded-xl border border-border px-4 py-2 text-xs font-bold disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </AdminPanel>
    </>
  );

  if (embedded) return content;

  return resolveWorkspaceRole(session.identity.role) === "RETAILER" ? (
    <BusinessPage
      identity={session.identity}
      active="reports"
      eyebrow="Financial reports"
      title="Transaction report"
      description="Filter, review and export your wallet-affecting transactions."
    >
      {content}
    </BusinessPage>
  ) : (
    <AdminLayout
      active="reports"
      eyebrow="Financial reports"
      title="Transaction report"
      description="Filter, review and export wallet-affecting transactions for your signed-in account."
    >
      {content}
    </AdminLayout>
  );
}
