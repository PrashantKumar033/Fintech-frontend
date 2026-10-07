import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

import { AdminLayout, AdminPanel } from "@/components/admin/admin-layout";
import { TransactionDetailDialog } from "@/components/transaction-detail-dialog";
import { getSession } from "@/lib/auth-api";
import {
  operationsApi,
  operationsMessage,
  type ProviderOperation,
  type ProviderTransactionPage,
  type ProviderTransactionStatus,
} from "@/lib/operations-api";

type Props = {
  title: string;
  description: string;
  operation?: ProviderOperation;
  initialStatus?: ProviderTransactionStatus | "";
  activeArea?: "aeps" | "transactions";
};

const statuses: Array<ProviderTransactionStatus | ""> = [
  "",
  "SUCCESS",
  "FAILED",
  "PENDING",
  "PROCESSING",
  "UNKNOWN",
  "REVERSED",
];
const operations: Array<ProviderOperation | ""> = ["", "BE", "MS", "CW", "AP", "CD"];
const operationLabels: Record<ProviderOperation, string> = {
  BE: "Balance enquiry",
  MS: "Mini statement",
  CW: "Cash withdrawal",
  AP: "Aadhaar Pay",
  CD: "Cash deposit",
};

export function NetworkAepsTransactions({
  title,
  description,
  operation,
  initialStatus = "",
  activeArea = "transactions",
}: Props) {
  const token = getSession()?.accessToken ?? "";
  const [result, setResult] = useState<ProviderTransactionPage | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ProviderTransactionStatus | "">(initialStatus);
  const [operationFilter, setOperationFilter] = useState<ProviderOperation | "">(operation ?? "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedReference, setSelectedReference] = useState<string | null>(null);

  useEffect(() => {
    setStatus(initialStatus);
    setPage(1);
  }, [initialStatus]);

  useEffect(() => {
    setOperationFilter(operation ?? "");
    setPage(1);
  }, [operation]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    operationsApi
      .networkTransactions(token, {
        page,
        limit: 25,
        status: status || undefined,
        operation: (operation ?? operationFilter) || undefined,
      })
      .then((response) => {
        if (active) setResult(response);
      })
      .catch((reason) => {
        if (active) setError(operationsMessage(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [operation, operationFilter, page, refreshKey, status, token]);

  const range = useMemo(() => {
    if (!result?.total) return "0 records";
    const start = (result.page - 1) * result.limit + 1;
    const end = Math.min(result.page * result.limit, result.total);
    return `${start}-${end} of ${result.total}`;
  }, [result]);

  return (
    <AdminLayout
      active={activeArea}
      eyebrow="AEPS network monitoring"
      title={title}
      description={description}
    >
      <AdminPanel>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            {!operation && (
              <label className="grid gap-1 text-xs font-bold text-secondary">
                Operation
                <select
                  value={operationFilter}
                  onChange={(event) => {
                    setOperationFilter(event.target.value as ProviderOperation | "");
                    setPage(1);
                  }}
                  className="cursor-pointer rounded-xl border border-border bg-white px-4 py-3 text-sm font-medium"
                >
                  {operations.map((value) => (
                    <option key={value || "ALL"} value={value}>
                      {value ? operationLabels[value] : "All operations"}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="grid gap-1 text-xs font-bold text-secondary">
              Status
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as ProviderTransactionStatus | "");
                  setPage(1);
                }}
                className="cursor-pointer rounded-xl border border-border bg-white px-4 py-3 text-sm font-medium"
              >
                {statuses.map((value) => (
                  <option key={value || "ALL"} value={value}>
                    {value || "All statuses"}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="button"
            onClick={() => setRefreshKey((value) => value + 1)}
            disabled={loading}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700"
          >
            {error}
          </p>
        )}

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                <th className="p-3">Retailer / identity</th>
                <th className="p-3">Reference</th>
                <th className="p-3">Provider reference</th>
                <th className="p-3">Operation</th>
                <th className="p-3">Provider</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {result?.data.map((row) => (
                <tr
                  key={row.id || `${row.identityId}:${row.referenceId}`}
                  className="border-b border-border/60"
                >
                  <td className="p-3">
                    <p className="font-bold">{row.sourceRole || "RETAILER"}</p>
                    <p
                      className="max-w-[190px] truncate text-xs text-muted-foreground"
                      title={row.identityId}
                    >
                      {row.identityId || "-"}
                    </p>
                  </td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => setSelectedReference(row.referenceId)}
                      className="cursor-pointer font-bold text-primary hover:underline"
                    >
                      {row.referenceId}
                    </button>
                  </td>
                  <td className="p-3 font-mono text-xs">
                    {row.providerReference || row.providerTxnRefId || "—"}
                  </td>
                  <td className="p-3">{operationLabels[row.operation] ?? row.operation}</td>
                  <td className="p-3">{row.provider}</td>
                  <td className="p-3">₹{Number(row.amount || 0).toLocaleString("en-IN")}</td>
                  <td className="p-3 font-bold">{row.status}</td>
                  <td className="p-3">{new Date(row.createdAt).toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && (
            <div className="grid min-h-40 place-items-center" aria-label="Loading transactions">
              <Loader2 className="animate-spin text-primary" />
            </div>
          )}
          {!loading && !error && !result?.data.length && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No matching AEPS transactions were found in your assigned network.
            </p>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
          <span className="text-xs font-semibold text-muted-foreground">{range}</span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={loading || page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="cursor-pointer rounded-xl border border-border px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={loading || !result || page >= result.totalPages}
              onClick={() => setPage((value) => value + 1)}
              className="cursor-pointer rounded-xl border border-border px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </AdminPanel>

      <TransactionDetailDialog
        accessToken={token}
        referenceId={selectedReference}
        scope="network"
        onClose={() => setSelectedReference(null)}
      />
    </AdminLayout>
  );
}
