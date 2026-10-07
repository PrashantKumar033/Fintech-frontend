import { useEffect, useState } from "react";
import { Eye, Loader2, ReceiptText, RefreshCw, RotateCcw, WalletCards, X } from "lucide-react";
import { useCallback } from "react";
import { AdminPanel } from "@/components/admin/admin-layout";
import {
  adminApi,
  getAdminActor,
  type AdminProviderTransaction,
  type ProviderIncomeInput,
  type ProviderReversal,
  type ProviderReversalDetail,
  type TransactionDetail,
} from "@/lib/admin-api";
import { useEffectiveAccess } from "@/hooks/use-effective-access";
import { UI_PERMISSION } from "@/lib/ui-permissions";
import { createIdempotencyKey } from "@/lib/idempotency-key";
import { ReadableTransactionDetails } from "@/components/readable-transaction-details";
import { TransactionDetailDialog } from "@/components/transaction-detail-dialog";
import { getSession } from "@/lib/auth-api";

type View = "transactions" | "income" | "reversals";

const messageOf = (value: unknown) =>
  value instanceof Error ? value.message : "The operation could not be completed.";

const money = (value: string | number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value) || 0);

const time = (value?: string | null) => (value ? new Date(value).toLocaleString("en-IN") : "—");

const inputClass =
  "rounded-xl border border-border bg-white px-3 py-2.5 text-xs outline-none focus:border-primary";

export function AdminTransactionOperations() {
  const actor = getAdminActor();
  const identitySession = actor?.kind === "IDENTITY_ADMIN" ? getSession() : null;
  const { can } = useEffectiveAccess();
  const allowed = (code: string) =>
    actor?.kind === "SUPER_ADMIN" ||
    (actor?.kind === "IDENTITY_ADMIN" && can(code, ["SUPER_ADMIN", "ADMIN"]));
  const canView = allowed(UI_PERMISSION.TRANSACTION_ADMIN_LIST);
  const canViewDetail = allowed(UI_PERMISSION.TRANSACTION_ADMIN_VIEW);
  const canViewIncome = allowed(UI_PERMISSION.TRANSACTION_PROVIDER_INCOME_VIEW);
  const canReconcileIncome = allowed(UI_PERMISSION.TRANSACTION_PROVIDER_INCOME_RECONCILE);
  const canRequestReversal = allowed(UI_PERMISSION.TRANSACTION_REVERSAL_REQUEST);
  const canListReversals = allowed(UI_PERMISSION.TRANSACTION_REVERSAL_LIST);
  const canViewReversal = allowed(UI_PERMISSION.TRANSACTION_REVERSAL_VIEW);
  const canProcessReversal = allowed(UI_PERMISSION.TRANSACTION_REVERSAL_PROCESS);
  const canRecover = allowed(UI_PERMISSION.TRANSACTION_FINANCIAL_RECOVERY);
  const canViewOwnReceipt =
    Boolean(identitySession) && can(UI_PERMISSION.AEPS_TRANSACTION_VIEW, ["ADMIN"]);
  const canViewNetworkReceipt =
    Boolean(identitySession) && can(UI_PERMISSION.AEPS_NETWORK_TRANSACTION_VIEW, ["ADMIN"]);

  const [view, setView] = useState<View>("transactions");
  const [transactions, setTransactions] = useState<AdminProviderTransaction[]>([]);
  const [reversals, setReversals] = useState<ProviderReversal[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [status, setStatus] = useState("");

  const [detail, setDetail] = useState<TransactionDetail | null>(null);
  const [reverseTarget, setReverseTarget] = useState<AdminProviderTransaction | null>(null);
  const [reason, setReason] = useState("");
  const [incomeTarget, setIncomeTarget] = useState<AdminProviderTransaction | null>(null);
  const [income, setIncome] = useState<ProviderIncomeInput>({ incomeSource: "PROVIDER_WALLET" });

  const [reversalDetail, setReversalDetail] = useState<ProviderReversalDetail | null>(null);
  const [reversalDetailLoading, setReversalDetailLoading] = useState(false);
  const [receiptTarget, setReceiptTarget] = useState<{
    referenceId: string;
    scope: "self" | "network";
  } | null>(null);

  const receiptScope = (item: AdminProviderTransaction): "self" | "network" | null => {
    if (!identitySession) return null;
    if (item.userId === identitySession.identity.id) return canViewOwnReceipt ? "self" : null;
    return canViewNetworkReceipt ? "network" : null;
  };

  useEffect(() => {
    if (view === "transactions" && !canView) {
      if (canViewIncome) setView("income");
      else if (canListReversals) setView("reversals");
    } else if (view === "income" && !canViewIncome) {
      if (canView) setView("transactions");
      else if (canListReversals) setView("reversals");
    } else if (view === "reversals" && !canListReversals) {
      if (canView) setView("transactions");
      else if (canViewIncome) setView("income");
    }
  }, [view, canView, canViewIncome, canListReversals]);

  const load = useCallback(async () => {
    if (
      (view === "transactions" && !canView) ||
      (view === "income" && !canViewIncome) ||
      (view === "reversals" && !canListReversals)
    ) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ page: "1", limit: "50" });
      if (status) query.set("status", status);

      if (view === "transactions") {
        setTransactions((await adminApi.providerTransactions(query.toString())).data || []);
      } else if (view === "income") {
        setTransactions((await adminApi.pendingProviderIncome(query.toString())).data || []);
      } else {
        setReversals((await adminApi.reversals(query.toString())).data || []);
      }
    } catch (value) {
      setError(messageOf(value));
    } finally {
      setLoading(false);
    }
  }, [view, status, canView, canViewIncome, canListReversals]);

  useEffect(() => {
    void load();
  }, [load]);

  async function inspect(referenceId: string) {
    if (!canViewDetail)
      return setError(`Permission ${UI_PERMISSION.TRANSACTION_ADMIN_VIEW} is required.`);
    setBusy(true);
    setError("");
    try {
      setDetail(await adminApi.transaction(referenceId));
    } catch (value) {
      setError(messageOf(value));
    } finally {
      setBusy(false);
    }
  }

  async function inspectReversal(referenceId: string) {
    if (!canViewReversal)
      return setError(`Permission ${UI_PERMISSION.TRANSACTION_REVERSAL_VIEW} is required.`);
    setReversalDetailLoading(true);
    setReversalDetail(null);
    setError("");
    try {
      setReversalDetail(await adminApi.reversal(referenceId));
    } catch (value) {
      setError(messageOf(value));
    } finally {
      setReversalDetailLoading(false);
    }
  }

  async function requestReversal() {
    if (!canRequestReversal)
      return setError(`Permission ${UI_PERMISSION.TRANSACTION_REVERSAL_REQUEST} is required.`);
    if (!reverseTarget || !reason.trim()) {
      setError("A reversal reason is required.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      await adminApi.requestReversal(
        reverseTarget.referenceId,
        reason.trim(),
        createIdempotencyKey("admin-reversal"),
      );
      setNotice(`Reversal requested for ${reverseTarget.referenceId}.`);
      setReverseTarget(null);
      setReason("");
      await load();
    } catch (value) {
      setError(messageOf(value));
    } finally {
      setBusy(false);
    }
  }

  async function reconcileIncome() {
    if (!canReconcileIncome)
      return setError(
        `Permission ${UI_PERMISSION.TRANSACTION_PROVIDER_INCOME_RECONCILE} is required.`,
      );
    if (!incomeTarget) return;

    setBusy(true);
    setError("");
    try {
      await adminApi.reconcileProviderIncome(incomeTarget.referenceId, income);
      setNotice(`Provider income reconciled for ${incomeTarget.referenceId}.`);
      setIncomeTarget(null);
      await load();
    } catch (value) {
      setError(messageOf(value));
    } finally {
      setBusy(false);
    }
  }

  async function processReversal(item: ProviderReversal) {
    if (!canProcessReversal)
      return setError(`Permission ${UI_PERMISSION.TRANSACTION_REVERSAL_PROCESS} is required.`);
    if (
      !window.confirm(
        `${item.status === "FAILED" ? "Retry" : "Process"} reversal ${item.referenceId}?`,
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");
    try {
      const result = await adminApi.processReversal(item.referenceId);
      setNotice(`Reversal ${item.referenceId} processed.`);
      if (reversalDetail?.referenceId === item.referenceId) setReversalDetail(result);
      await load();
    } catch (value) {
      setError(messageOf(value));
    } finally {
      setBusy(false);
    }
  }

  async function recover(item: AdminProviderTransaction) {
    if (!canRecover)
      return setError(`Permission ${UI_PERMISSION.TRANSACTION_FINANCIAL_RECOVERY} is required.`);
    if (!window.confirm(`Retry financial effects for ${item.referenceId}?`)) return;

    setBusy(true);
    setError("");
    try {
      await adminApi.recoverFinancialEffects(item.referenceId);
      setNotice(`Financial recovery requested for ${item.referenceId}.`);
      await load();
    } catch (value) {
      setError(messageOf(value));
    } finally {
      setBusy(false);
    }
  }

  if (!canView && !canViewIncome && !canListReversals) return null;

  const tabs: Array<[View, string]> = [];
  if (canView) tabs.push(["transactions", "All transactions"]);
  if (canViewIncome) tabs.push(["income", "Pending provider income"]);
  if (canListReversals) tabs.push(["reversals", "Reversals"]);

  return (
    <AdminPanel className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Transaction operations</h2>
          <p className="text-xs text-muted-foreground">
            Provider transactions, income settlement and reversal lifecycle.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          title="Refresh transaction operations"
          className="rounded-xl border border-border p-3"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {tabs.map(([key, text]) => (
          <button
            type="button"
            key={key}
            onClick={() => {
              setView(key);
              setStatus("");
            }}
            className={`rounded-xl px-4 py-2.5 text-xs font-extrabold ${
              view === key ? "bg-secondary text-white" : "border border-border"
            }`}
          >
            {text}
          </button>
        ))}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700"
        >
          {error}
        </p>
      )}
      {notice && (
        <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
          {notice}
        </p>
      )}

      <div className="mt-4 flex justify-end">
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className={inputClass}
        >
          <option value="">All statuses</option>
          {(view === "reversals"
            ? ["REQUESTED", "PROCESSING", "COMPLETED", "FAILED", "UNKNOWN"]
            : ["INITIATED", "PROCESSING", "SUCCESS", "FAILED", "PENDING", "UNKNOWN", "REVERSED"]
          ).map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-border">
        {loading ? (
          <div className="grid h-40 place-items-center">
            <Loader2 className="animate-spin text-primary" />
          </div>
        ) : view === "reversals" ? (
          <ReversalTable
            items={reversals}
            busy={busy}
            inspect={inspectReversal}
            process={processReversal}
            canProcess={canProcessReversal}
            canInspect={canViewReversal}
          />
        ) : (
          <TransactionTable
            items={transactions}
            view={view}
            inspect={inspect}
            reverse={setReverseTarget}
            income={setIncomeTarget}
            recover={recover}
            canReconcileIncome={canReconcileIncome}
            canRequestReversal={canRequestReversal}
            canRecover={canRecover}
            canInspect={canViewDetail}
            receiptScope={receiptScope}
            openReceipt={(item, scope) =>
              setReceiptTarget({ referenceId: item.referenceId, scope })
            }
          />
        )}
      </div>

      {detail && (
        <div className="fixed inset-0 z-[110] grid place-items-center bg-secondary/60 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex justify-between gap-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-primary">
                  Provider transaction
                </p>
                <h3 className="mt-1 text-xl font-black">Transaction detail</h3>
              </div>
              <button
                type="button"
                onClick={() => setDetail(null)}
                aria-label="Close transaction detail"
                className="h-fit rounded-lg border border-border p-2"
              >
                <X size={18} />
              </button>
            </div>
            <ReadableTransactionDetails detail={detail} />
          </div>
        </div>
      )}

      {identitySession && receiptTarget && (
        <TransactionDetailDialog
          accessToken={identitySession.accessToken}
          referenceId={receiptTarget.referenceId}
          scope={receiptTarget.scope}
          onClose={() => setReceiptTarget(null)}
        />
      )}

      {reversalDetailLoading && (
        <div className="fixed inset-0 z-[105] grid place-items-center bg-secondary/60 p-4">
          <div className="flex items-center gap-2 rounded-2xl bg-white px-6 py-5 text-sm font-bold shadow-xl">
            <Loader2 size={18} className="animate-spin text-primary" />
            Loading reversal details…
          </div>
        </div>
      )}

      {reversalDetail && (
        <ReversalDetailDialog detail={reversalDetail} close={() => setReversalDetail(null)} />
      )}

      {reverseTarget && (
        <Dialog
          title="Request reversal"
          busy={busy}
          close={() => setReverseTarget(null)}
          confirm={() => void requestReversal()}
        >
          <p className="break-all text-xs">{reverseTarget.referenceId}</p>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            placeholder="Required reversal reason"
            className={`${inputClass} mt-4 w-full`}
          />
        </Dialog>
      )}

      {incomeTarget && (
        <Dialog
          title="Reconcile provider income"
          busy={busy}
          close={() => setIncomeTarget(null)}
          confirm={() => void reconcileIncome()}
        >
          <p className="break-all text-xs">{incomeTarget.referenceId}</p>
          <div className="mt-4 grid gap-3">
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={income.providerIncomeAmount ?? ""}
              onChange={(event) =>
                setIncome({
                  ...income,
                  providerIncomeAmount: event.target.value ? Number(event.target.value) : undefined,
                })
              }
              placeholder="Income amount (optional)"
              className={inputClass}
            />
            <select
              value={income.incomeSource}
              onChange={(event) =>
                setIncome({
                  ...income,
                  incomeSource: event.target.value as ProviderIncomeInput["incomeSource"],
                })
              }
              className={inputClass}
            >
              <option value="PROVIDER_WALLET">PROVIDER WALLET</option>
              <option value="PROVIDER_MS">PROVIDER MS</option>
            </select>
            <input
              value={income.externalReference ?? ""}
              onChange={(event) =>
                setIncome({ ...income, externalReference: event.target.value || undefined })
              }
              placeholder="External reference (optional)"
              className={inputClass}
            />
          </div>
        </Dialog>
      )}
    </AdminPanel>
  );
}

function TransactionTable({
  items,
  view,
  inspect,
  reverse,
  income,
  recover,
  canReconcileIncome,
  canRequestReversal,
  canRecover,
  canInspect,
  receiptScope,
  openReceipt,
}: {
  items: AdminProviderTransaction[];
  view: View;
  inspect: (id: string) => void;
  reverse: (item: AdminProviderTransaction) => void;
  income: (item: AdminProviderTransaction) => void;
  recover: (item: AdminProviderTransaction) => void;
  canReconcileIncome: boolean;
  canRequestReversal: boolean;
  canRecover: boolean;
  canInspect: boolean;
  receiptScope: (item: AdminProviderTransaction) => "self" | "network" | null;
  openReceipt: (item: AdminProviderTransaction, scope: "self" | "network") => void;
}) {
  return (
    <table className="w-full min-w-[1000px] text-left text-xs">
      <thead className="bg-muted">
        <tr>
          {[
            "Reference",
            "Provider reference",
            "User",
            "Provider",
            "Amount",
            "Status",
            "Settlement",
            "Commission",
            "Created",
            "Actions",
          ].map((value) => (
            <th key={value} className="p-3">
              {value}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.referenceId} className="border-t">
            <td className="p-3 font-bold">{item.referenceId}</td>
            <td className="p-3 font-mono text-[11px]">
              {item.providerReference || item.providerTxnRefId || "—"}
            </td>
            <td className="p-3">
              <p className="font-bold">{item.userLoginId || item.merchantRefId || "Unknown"}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {item.userRole || item.sourceRole || "Account"}
              </p>
            </td>
            <td className="p-3">
              {item.provider} / {item.operation}
            </td>
            <td className="p-3 font-bold">{money(item.amount)}</td>
            <td className="p-3 font-bold">{item.status}</td>
            <td className="p-3">{item.settlementStatus || "—"}</td>
            <td className="p-3">{item.commissionStatus || "—"}</td>
            <td className="p-3">{time(item.createdAt)}</td>
            <td className="p-3">
              <div className="flex gap-2">
                {canInspect && (
                  <button
                    type="button"
                    title="View transaction"
                    onClick={() => inspect(item.referenceId)}
                    className="rounded-lg border p-2"
                  >
                    <Eye size={14} />
                  </button>
                )}
                {receiptScope(item) && (
                  <button
                    type="button"
                    title="View or download receipt"
                    aria-label={`View receipt ${item.referenceId}`}
                    onClick={() => openReceipt(item, receiptScope(item)!)}
                    className="rounded-lg border border-border p-2 text-primary"
                  >
                    <ReceiptText size={14} />
                  </button>
                )}
                {view === "income" && canReconcileIncome && (
                  <button
                    type="button"
                    title="Reconcile income"
                    onClick={() => income(item)}
                    className="rounded-lg border border-emerald-200 p-2 text-emerald-700"
                  >
                    <WalletCards size={14} />
                  </button>
                )}
                {view === "transactions" && canRequestReversal && item.status === "SUCCESS" && (
                  <button
                    type="button"
                    title="Request reversal"
                    onClick={() => reverse(item)}
                    className="rounded-lg border border-amber-200 p-2 text-amber-700"
                  >
                    <RotateCcw size={14} />
                  </button>
                )}
                {view === "transactions" &&
                  canRecover &&
                  !item.needsReconciliation &&
                  (item.settlementStatus === "FAILED" || item.commissionStatus === "FAILED") && (
                    <button
                      type="button"
                      onClick={() => recover(item)}
                      className="rounded-lg border px-2 py-1 font-bold text-red-700"
                    >
                      Recover
                    </button>
                  )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ReversalTable({
  items,
  busy,
  inspect,
  process,
  canProcess,
  canInspect,
}: {
  items: ProviderReversal[];
  busy: boolean;
  inspect: (referenceId: string) => void;
  process: (item: ProviderReversal) => void;
  canProcess: boolean;
  canInspect: boolean;
}) {
  return (
    <table className="w-full min-w-[900px] text-left text-xs">
      <thead className="bg-muted">
        <tr>
          {["Reversal", "Transaction", "Provider", "Amount", "Status", "Reason", "Actions"].map(
            (value) => (
              <th key={value} className="p-3">
                {value}
              </th>
            ),
          )}
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.referenceId} className="border-t">
            <td className="p-3 font-bold">{item.referenceId}</td>
            <td className="p-3">{item.providerTransactionReference}</td>
            <td className="p-3">{item.provider}</td>
            <td className="p-3">{money(item.amount)}</td>
            <td className="p-3 font-bold">{item.status}</td>
            <td className="p-3">{item.failedReason || item.reason || "—"}</td>
            <td className="p-3">
              <div className="flex items-center gap-2">
                {canInspect && (
                  <button
                    type="button"
                    title="View reversal detail"
                    aria-label={`View reversal ${item.referenceId}`}
                    onClick={() => void inspect(item.referenceId)}
                    className="rounded-lg border border-border p-2"
                  >
                    <Eye size={14} />
                  </button>
                )}
                {canProcess && ["REQUESTED", "FAILED"].includes(item.status) && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void process(item)}
                    className="rounded-lg bg-primary px-3 py-2 font-bold text-white disabled:opacity-50"
                  >
                    {item.status === "FAILED" ? "Retry" : "Process"}
                  </button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ReversalDetailDialog({
  detail,
  close,
}: {
  detail: ProviderReversalDetail;
  close: () => void;
}) {
  const topFields: Array<[string, string | number | null | undefined]> = [
    ["Reversal Reference", detail.referenceId],
    ["Status", detail.status],
    ["Amount", money(detail.amount)],
    ["Reason", detail.reason],
    ["Requested By", detail.requestedBy],
    ["Processed By", detail.processedBy],
    ["Principal Status", detail.principalStatus],
    ["Commission Status", detail.commissionStatus],
    ["Compensation Reference", detail.compensationReferenceId],
    ["Principal Compensation", detail.principalCompensationReference],
    ["Commission Reversal", detail.commissionReversalReference],
    ["Processing At", time(detail.processingAt)],
    ["Completed At", time(detail.completedAt)],
    ["Created At", time(detail.createdAt)],
    ["Updated At", time(detail.updatedAt)],
  ];

  const transaction = detail.providerTransaction;
  const transactionFields: Array<[string, string | number | boolean | null | undefined]> =
    transaction
      ? [
          ["Transaction Reference", transaction.referenceId],
          ["Provider", transaction.provider],
          ["Service", transaction.serviceType],
          ["Operation", transaction.operation],
          ["Original Amount", money(transaction.amount)],
          ["Transaction Status", transaction.status],
          ["Settlement Status", transaction.settlementStatus],
          ["Commission Status", transaction.commissionStatus],
          ["Commission Amount", transaction.commissionAmount],
          ["Provider Transaction Ref", transaction.providerTxnRefId],
          ["RRN", transaction.rrn],
          ["NPCI Code", transaction.npciCode],
          ["NPCI Message", transaction.npciMessage],
          ["Needs Reconciliation", transaction.needsReconciliation],
          ["Created At", time(transaction.createdAt)],
          ["Completed At", time(transaction.completedAt)],
        ]
      : [];

  return (
    <div className="fixed inset-0 z-[110] grid place-items-center bg-secondary/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary">
              Reversal lifecycle
            </p>
            <h2 className="mt-1 text-xl font-black text-secondary">Reversal details</h2>
            <p className="mt-1 break-all text-xs text-muted-foreground">{detail.referenceId}</p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close reversal detail"
            className="rounded-lg border border-border p-2 text-muted-foreground"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {topFields.map(([key, value]) => (
            <DetailCell key={key} label={key} value={value} />
          ))}
        </div>

        {(detail.failedReason ||
          detail.principalFailureReason ||
          detail.commissionFailureReason) && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
            <h3 className="text-sm font-black text-red-800">Failure information</h3>
            <div className="mt-3 grid gap-2 text-xs text-red-800">
              {detail.failedReason && (
                <p>
                  <strong>Reversal:</strong> {detail.failedReason}
                </p>
              )}
              {detail.principalFailureReason && (
                <p>
                  <strong>Principal:</strong> {detail.principalFailureReason}
                </p>
              )}
              {detail.commissionFailureReason && (
                <p>
                  <strong>Commission:</strong> {detail.commissionFailureReason}
                </p>
              )}
            </div>
          </div>
        )}

        {transaction && (
          <div className="mt-5 rounded-xl border border-border">
            <div className="border-b border-border px-4 py-3">
              <h3 className="text-sm font-black text-secondary">Original provider transaction</h3>
              <p className="mt-1 text-[10px] text-muted-foreground">
                The provider transaction linked to this reversal.
              </p>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {transactionFields.map(([key, value]) => (
                <DetailCell key={key} label={key} value={value} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailCell({
  label,
  value,
}: {
  label: string;
  value: string | number | boolean | null | undefined;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3">
      <p className="text-[9px] font-extrabold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-all text-xs font-bold text-secondary">
        {value === null || value === undefined || value === "" ? "—" : String(value)}
      </p>
    </div>
  );
}

function Dialog({
  title,
  busy,
  close,
  confirm,
  children,
}: {
  title: string;
  busy: boolean;
  close: () => void;
  confirm: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-secondary/60 p-4">
      <div role="dialog" aria-modal="true" className="w-full max-w-lg rounded-2xl bg-white p-6">
        <h2 className="text-xl font-black">{title}</h2>
        <div className="mt-2">{children}</div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={close}
            className="rounded-xl border px-4 py-3 text-xs font-bold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={confirm}
            className="rounded-xl bg-primary px-4 py-3 text-xs font-bold text-white"
          >
            {busy ? "Working..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
