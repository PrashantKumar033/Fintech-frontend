import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Eye,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  WalletCards,
  XCircle,
} from "lucide-react";
import { AdminLayout, AdminPanel } from "@/components/admin/admin-layout";
import { ActionPermissionNotice } from "@/components/action-permission-notice";
import { useEffectiveAccess } from "@/hooks/use-effective-access";
import { UI_PERMISSION } from "@/lib/ui-permissions";
import { AdminTransactionOperations } from "@/components/admin/admin-transaction-operations";
import { ReadableTransactionDetails } from "@/components/readable-transaction-details";
import {
  AdminApiError,
  adminApi,
  getAdminActor,
  type ReconciliationItem,
  type ReconciliationResolution,
  type RecoverFinancialEffectsResult,
  type TransactionDetail,
} from "@/lib/admin-api";
import {
  canRecoverProviderFinancialEffects,
  canResolveProviderTransaction,
  providerTransactionDescription,
} from "@/lib/provider-transaction-ui";

export const Route = createFileRoute("/admin/transactions/")({ component: Transactions });
const inputClass =
  "w-full rounded-xl border border-border bg-white px-3.5 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";
type Action = { kind: "resolve" | "recover" | "reverse"; item: ReconciliationItem } | null;
const messageOf = (error: unknown) =>
  error instanceof AdminApiError || error instanceof Error
    ? error.message
    : "The request could not be completed.";
function dateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
function amount(value?: string | number) {
  const number = Number(value);
  return Number.isFinite(number)
    ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(number)
    : "—";
}

function Transactions() {
  const actor = getAdminActor();
  const { can } = useEffectiveAccess();
  const dedicatedSuperAdmin = actor?.kind === "SUPER_ADMIN";
  const canViewTransaction =
    dedicatedSuperAdmin || can(UI_PERMISSION.TRANSACTION_ADMIN_VIEW, ["SUPER_ADMIN", "ADMIN"]);
  const canViewReconciliation =
    dedicatedSuperAdmin ||
    can(UI_PERMISSION.TRANSACTION_RECONCILIATION_VIEW, ["SUPER_ADMIN", "ADMIN"]);
  const canResolve =
    dedicatedSuperAdmin ||
    can(UI_PERMISSION.TRANSACTION_RECONCILIATION_RESOLVE, ["SUPER_ADMIN", "ADMIN"]);
  const canReverse =
    dedicatedSuperAdmin ||
    can(UI_PERMISSION.TRANSACTION_REVERSAL_REQUEST, ["SUPER_ADMIN", "ADMIN"]);
  const canRecover =
    dedicatedSuperAdmin ||
    can(UI_PERMISSION.TRANSACTION_FINANCIAL_RECOVERY, ["SUPER_ADMIN", "ADMIN"]);
  const [items, setItems] = useState<ReconciliationItem[]>([]),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [operation, setOperation] = useState("");
  const [page, setPage] = useState(1),
    [totalPages, setTotalPages] = useState(1),
    [total, setTotal] = useState(0);
  const [detail, setDetail] = useState<TransactionDetail | null>(null),
    [detailBusy, setDetailBusy] = useState(false),
    [action, setAction] = useState<Action>(null);
  const [resolution, setResolution] = useState<ReconciliationResolution>("SUCCESS"),
    [note, setNote] = useState(""),
    [providerTxnRefId, setProviderTxnRefId] = useState(""),
    [rrn, setRrn] = useState("");
  const [recoveryResult, setRecoveryResult] = useState<RecoverFinancialEffectsResult | null>(null);
  const [recoveryCandidate, setRecoveryCandidate] = useState<ReconciliationItem | null>(null);

  const load = useCallback(
    async (targetPage: number) => {
      if (!canViewReconciliation) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ page: String(targetPage), limit: "25" });
        if (status) params.set("status", status);
        if (operation) params.set("operation", operation);
        const result = await adminApi.reconciliation(params.toString());
        setItems(result.data || []);
        setPage(result.page || targetPage);
        setTotalPages(Math.max(result.totalPages || 1, 1));
        setTotal(result.total || 0);
      } catch (caught) {
        setError(messageOf(caught));
      } finally {
        setLoading(false);
      }
    },
    [canViewReconciliation, operation, status],
  );
  useEffect(() => {
    if (canViewReconciliation) void load(1);
    else setLoading(false);
  }, [load, canViewReconciliation]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle
      ? items.filter((item) =>
          `${item.referenceId} ${item.provider || ""} ${item.serviceType || ""} ${item.userId || ""} ${item.rrn || ""}`
            .toLowerCase()
            .includes(needle),
        )
      : items;
  }, [items, query]);
  async function inspect(referenceId: string) {
    if (!canViewTransaction)
      return setError(`Permission ${UI_PERMISSION.TRANSACTION_ADMIN_VIEW} is required.`);
    setDetailBusy(true);
    setError("");
    try {
      setDetail(await adminApi.transaction(referenceId));
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setDetailBusy(false);
    }
  }
  function openAction(kind: "resolve" | "recover" | "reverse", item: ReconciliationItem) {
    if (kind === "resolve" && !canResolve)
      return setError(
        `Permission ${UI_PERMISSION.TRANSACTION_RECONCILIATION_RESOLVE} is required.`,
      );
    if (kind === "reverse" && !canReverse)
      return setError(`Permission ${UI_PERMISSION.TRANSACTION_REVERSAL_REQUEST} is required.`);
    if (kind === "recover" && !canRecover)
      return setError(`Permission ${UI_PERMISSION.TRANSACTION_FINANCIAL_RECOVERY} is required.`);
    setAction({ kind, item });
    setResolution("SUCCESS");
    setNote("");
    setProviderTxnRefId(item.providerTxnRefId || "");
    setRrn(item.rrn || "");
    setError("");
    setNotice("");
  }
  async function submitAction(event: FormEvent) {
    event.preventDefault();
    if (!action || busy) return;
    if (action.kind === "resolve" && !canResolve)
      return setError(
        `Permission ${UI_PERMISSION.TRANSACTION_RECONCILIATION_RESOLVE} is required.`,
      );
    if (action.kind === "reverse" && !canReverse)
      return setError(`Permission ${UI_PERMISSION.TRANSACTION_REVERSAL_REQUEST} is required.`);
    if (action.kind === "recover" && !canRecover)
      return setError(`Permission ${UI_PERMISSION.TRANSACTION_FINANCIAL_RECOVERY} is required.`);
    if (action.kind !== "recover" && !note.trim())
      return setError(
        action.kind === "reverse"
          ? "Enter a reversal reason."
          : "Enter an operator note for the audit trail.",
      );
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (action.kind === "resolve") {
        const result = await adminApi.resolveTransaction(action.item.referenceId, {
          resolution,
          note: note.trim(),
          providerTxnRefId: providerTxnRefId.trim() || undefined,
          rrn: rrn.trim() || undefined,
        });
        setNotice(
          result.nextAction === "RECOVER_FINANCIAL_EFFECTS"
            ? `Transaction ${action.item.referenceId} resolved as ${resolution}. Financial effects must now be finalized.`
            : `Transaction ${action.item.referenceId} resolved as ${resolution}.`,
        );
        setRecoveryCandidate(
          result.nextAction === "RECOVER_FINANCIAL_EFFECTS"
            ? {
                referenceId: action.item.referenceId,
                status: result.status || resolution,
                needsReconciliation: result.needsReconciliation ?? true,
                statusDescription: result.statusDescription,
              }
            : null,
        );
      } else if (action.kind === "recover") {
        const result = await adminApi.recoverFinancialEffects(action.item.referenceId);
        setRecoveryResult(result);
        setNotice(
          result.recoveryComplete && !result.transaction.needsReconciliation
            ? `Financial state finalized for ${action.item.referenceId}. Provider outcome remains ${result.transaction.status}.`
            : `Financial recovery for ${action.item.referenceId} remains incomplete. Provider outcome remains ${result.transaction.status}.`,
        );
        if (result.recoveryComplete && !result.transaction.needsReconciliation) {
          setRecoveryCandidate((current) =>
            current?.referenceId === action.item.referenceId ? null : current,
          );
        }
      } else {
        await adminApi.requestReversal(action.item.referenceId, note.trim(), crypto.randomUUID());
        setNotice(`Reversal request submitted for ${action.item.referenceId}.`);
      }
      setAction(null);
      await load(page);
      if (detail?.referenceId === action.item.referenceId) {
        await inspect(action.item.referenceId);
      }
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setBusy(false);
    }
  }
  return (
    <AdminLayout
      active="transactions"
      eyebrow="Payments operations"
      title="Transactions & reconciliation"
      description="Search uncertain provider transactions, inspect the full record, resolve reconciliation and request controlled reversals."
    >
      <AdminTransactionOperations />
      {!canViewReconciliation && (
        <div className="mb-6">
          <ActionPermissionNotice
            permission={UI_PERMISSION.TRANSACTION_RECONCILIATION_VIEW}
            title="Reconciliation queue is not enabled"
          />
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <Summary label="Queue total" value={String(total)} />
        <Summary
          label="Pending on page"
          value={String(items.filter((item) => item.status === "PENDING").length)}
        />
        <Summary
          label="Unknown on page"
          value={String(items.filter((item) => item.status === "UNKNOWN").length)}
        />
      </div>
      <AdminPanel className="mt-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-xl font-black">Reconciliation queue</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Every action is sent to the live admin transaction API and must be confirmed.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            <label className="flex items-center gap-2 rounded-xl border border-border bg-white px-3">
              <Search size={15} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Reference, RRN…"
                className="min-w-0 bg-transparent py-3 text-xs outline-none"
              />
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={inputClass}
            >
              <option value="">All statuses</option>
              <option>PENDING</option>
              <option>UNKNOWN</option>
              <option>SUCCESS</option>
              <option>FAILED</option>
            </select>
            <select
              value={operation}
              onChange={(e) => setOperation(e.target.value)}
              className={inputClass}
            >
              <option value="">All operations</option>
              {["BE", "MS", "CW", "AP", "CD"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
            <button
              onClick={() => void load(page)}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 text-xs font-extrabold text-white disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>
        {error && (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700"
          >
            {error}
          </p>
        )}
        {notice && (
          <p className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
            {notice}
          </p>
        )}
        {recoveryCandidate &&
          canRecover &&
          canRecoverProviderFinancialEffects(recoveryCandidate) && (
            <button
              type="button"
              disabled={busy}
              onClick={() => openAction("recover", recoveryCandidate)}
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-extrabold text-amber-900 disabled:opacity-50"
            >
              <WalletCards size={16} />
              Recover financial effects
            </button>
          )}
        {recoveryResult && <RecoveryResultSummary result={recoveryResult} />}
        <div className="mt-5 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-muted/60">
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="p-3">Reference</th>
                <th className="p-3">Provider / service</th>
                <th className="p-3">Operation</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3">Reason</th>
                <th className="p-3">Created</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr key={item.referenceId} className="border-t border-border/70 align-top">
                  <td className="p-3">
                    <p className="max-w-[190px] break-all font-black">{item.referenceId}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {item.userId || "User unavailable"}
                    </p>
                  </td>
                  <td className="p-3">
                    <p className="font-bold">{item.provider || "—"}</p>
                    <p className="text-xs text-muted-foreground">{item.serviceType || "—"}</p>
                  </td>
                  <td className="p-3 font-bold">{item.operation || "—"}</td>
                  <td className="p-3 font-black">{amount(item.amount)}</td>
                  <td className="p-3">
                    <Status value={item.status || "UNKNOWN"} />
                  </td>
                  <td className="max-w-[220px] p-3 text-xs leading-5 text-muted-foreground">
                    {providerTransactionDescription(item)}
                  </td>
                  <td className="p-3 text-xs">{dateTime(item.createdAt)}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      {canViewTransaction && (
                        <ActionButton
                          title="View transaction"
                          onClick={() => void inspect(item.referenceId)}
                        >
                          <Eye size={15} />
                        </ActionButton>
                      )}
                      {canResolve && canResolveProviderTransaction(item) && (
                        <ActionButton
                          title="Resolve"
                          tone="good"
                          onClick={() => openAction("resolve", item)}
                        >
                          <CheckCircle2 size={15} />
                        </ActionButton>
                      )}
                      {canRecover && canRecoverProviderFinancialEffects(item) && (
                        <ActionButton
                          title="Recover financial effects"
                          tone="warn"
                          onClick={() => openAction("recover", item)}
                        >
                          <WalletCards size={15} />
                        </ActionButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="animate-spin" size={17} />
              Loading live queue…
            </div>
          )}
          {!loading && !visible.length && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No transactions match the current filters.
            </p>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={loading || page <= 1}
              onClick={() => void load(page - 1)}
              className="rounded-lg border border-border px-3 py-2 font-bold disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={loading || page >= totalPages}
              onClick={() => void load(page + 1)}
              className="rounded-lg border border-border px-3 py-2 font-bold disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </AdminPanel>
      {(detail || detailBusy) && (
        <AdminPanel className="mt-6 border-primary/25">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-primary">
                Transaction details
              </p>
              <h2 className="mt-1 text-xl font-black">
                {detail?.referenceId || "Loading record…"}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {detail?.referenceId && canRecover && canRecoverProviderFinancialEffects(detail) && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    openAction("recover", {
                      referenceId: detail.referenceId!,
                      status: detail.status,
                      needsReconciliation: detail.needsReconciliation,
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-200 px-3 py-2 text-xs font-extrabold text-amber-800 disabled:opacity-50"
                >
                  <WalletCards size={15} />
                  Finalize financial state
                </button>
              )}
              <button onClick={() => setDetail(null)} aria-label="Close details">
                <XCircle size={21} />
              </button>
            </div>
          </div>
          {detailBusy ? (
            <div className="py-10 text-center">
              <Loader2 className="mx-auto animate-spin text-primary" />
            </div>
          ) : (
            detail && (
              <ReadableTransactionDetails
                detail={detail}
                className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
              />
            )
          )}
        </AdminPanel>
      )}
      {action && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-secondary/55 p-4">
          <form
            onSubmit={submitAction}
            className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <span
                className={`grid h-11 w-11 place-items-center rounded-xl ${action.kind === "resolve" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
              >
                {action.kind === "resolve" ? (
                  <CheckCircle2 />
                ) : action.kind === "recover" ? (
                  <WalletCards />
                ) : (
                  <RotateCcw />
                )}
              </span>
              <div>
                <p className="text-xs font-extrabold uppercase text-primary">
                  Controlled admin action
                </p>
                <h2 className="text-xl font-black">
                  {action.kind === "resolve"
                    ? "Resolve reconciliation"
                    : action.kind === "recover"
                      ? "Finalize financial state"
                      : "Request reversal"}
                </h2>
                <p className="mt-1 break-all text-xs text-muted-foreground">
                  {action.item.referenceId}
                </p>
              </div>
            </div>
            {action.kind === "resolve" && (
              <>
                <label className="mt-5 block text-xs font-extrabold">
                  FINAL RESOLUTION
                  <select
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value as ReconciliationResolution)}
                    className={`${inputClass} mt-2`}
                  >
                    <option value="SUCCESS">SUCCESS — provider confirmed</option>
                    <option value="FAILED">FAILED — release/rollback safely</option>
                  </select>
                </label>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-extrabold">
                    PROVIDER TXN REF
                    <input
                      value={providerTxnRefId}
                      onChange={(e) => setProviderTxnRefId(e.target.value)}
                      className={`${inputClass} mt-2`}
                    />
                  </label>
                  <label className="text-xs font-extrabold">
                    RRN
                    <input
                      value={rrn}
                      onChange={(e) => setRrn(e.target.value)}
                      className={`${inputClass} mt-2`}
                    />
                  </label>
                </div>
              </>
            )}
            {action.kind !== "recover" && (
              <label className="mt-4 block text-xs font-extrabold">
                {action.kind === "resolve" ? "OPERATOR NOTE" : "REVERSAL REASON"}
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className={`${inputClass} mt-2 resize-none`}
                  placeholder="Required for the audit trail"
                />
              </label>
            )}
            <div className="mt-4 flex gap-3 rounded-xl bg-amber-50 p-4 text-xs leading-5 text-amber-900">
              <ShieldAlert size={18} className="shrink-0" />
              <p>
                {action.kind === "recover"
                  ? `This finalizes wallet, settlement and commission effects for the existing ${action.item.status} provider outcome. It does not change a FAILED provider outcome to SUCCESS.`
                  : "Confirm provider evidence before continuing. Financial actions are idempotent and audited by the backend."}
              </p>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setAction(null)}
                className="rounded-xl border border-border px-4 py-3 text-xs font-extrabold"
              >
                Cancel
              </button>
              <button
                disabled={busy}
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-xs font-extrabold text-white ${action.kind === "resolve" ? "bg-emerald-600" : "bg-amber-600"}`}
              >
                {busy && <Loader2 size={14} className="animate-spin" />}
                {action.kind === "recover" ? "Recover financial effects" : "Confirm action"}
              </button>
            </div>
          </form>
        </div>
      )}
    </AdminLayout>
  );
}
function RecoveryResultSummary({ result }: { result: RecoverFinancialEffectsResult }) {
  const walletReference = result.walletTransaction
    ? String(
        result.walletTransaction.referenceId ??
          result.walletTransaction.transactionReference ??
          result.walletTransaction.id ??
          "Recorded",
      )
    : "Not created";
  return (
    <div className="mt-5 rounded-xl border border-border bg-muted/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-extrabold uppercase tracking-wider text-secondary">
          Financial recovery result
        </p>
        <Status value={result.recoveryComplete ? "COMPLETE" : "INCOMPLETE"} />
      </div>
      <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2 xl:grid-cols-3">
        <RecoveryValue label="Provider outcome" value={result.transaction.status} />
        <RecoveryValue
          label="Description"
          value={providerTransactionDescription(result.transaction)}
        />
        <RecoveryValue
          label="Needs reconciliation"
          value={result.transaction.needsReconciliation ? "YES" : "NO"}
        />
        <RecoveryValue label="Settlement" value={result.settlement.status || "—"} />
        <RecoveryValue label="Commission" value={result.commission.status || "—"} />
        <RecoveryValue label="Wallet transaction" value={walletReference} />
      </div>
      {result.commission.reason && (
        <p className="mt-3 text-xs text-muted-foreground">{result.commission.reason}</p>
      )}
    </div>
  );
}
function RecoveryValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-extrabold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 break-all font-bold text-secondary">{value}</p>
    </div>
  );
}
function Summary({ label, value }: { label: string; value: string }) {
  return (
    <AdminPanel>
      <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-secondary">{value}</p>
    </AdminPanel>
  );
}
function Status({ value }: { value: string }) {
  const normalized = value.toUpperCase();
  const tone = ["SUCCESS", "COMPLETE", "COMPLETED"].includes(normalized)
    ? "bg-emerald-50 text-emerald-700"
    : ["FAILED", "UNKNOWN", "INCOMPLETE"].includes(normalized)
      ? "bg-red-50 text-red-700"
      : "bg-amber-50 text-amber-800";
  return (
    <span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${tone}`}>{value}</span>
  );
}
function ActionButton({
  title,
  onClick,
  tone,
  children,
}: {
  title: string;
  onClick: () => void;
  tone?: "good" | "warn";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`rounded-lg border p-2 ${tone === "good" ? "border-emerald-200 text-emerald-700" : tone === "warn" ? "border-amber-200 text-amber-700" : "border-border text-secondary"}`}
    >
      {children}
    </button>
  );
}
