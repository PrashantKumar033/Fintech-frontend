import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  BarChart3,
  CircleAlert,
  Eye,
  FileCheck2,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { AdminPanel } from "@/components/admin/admin-layout";
import { ActionPermissionNotice } from "@/components/action-permission-notice";
import { useEffectiveAccess } from "@/hooks/use-effective-access";
import {
  adminApi,
  getAdminActor,
  type AdminPayoutOverview,
  type AdminPayoutOverviewFilters,
  type AdminPayoutOverviewRange,
  type AdminPayoutReconciliation,
  type AdminPayoutSettlement,
  type AdminPayoutSettlementFilters,
  type ProviderRegistryEntry,
  type ResolvePayoutReconciliationInput,
} from "@/lib/admin-api";
import type { PayoutSettlementStatus } from "@/lib/payout-api";
import {
  payoutFailureDescription,
  payoutFailureNpciCode,
  payoutProviderPublicName,
} from "@/lib/payout-ui";
import { UI_PERMISSION } from "@/lib/ui-permissions";

type View = "settlements" | "reconciliation";

const payoutStatuses: Array<PayoutSettlementStatus | ""> = [
  "",
  "CREATED",
  "WALLET_RESERVE_PENDING",
  "RESERVED",
  "SUBMITTING",
  "QUEUED",
  "PENDING",
  "SUCCESS",
  "FAILED",
  "UNKNOWN",
];

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
});

const inputClass =
  "w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-primary";

function formatTime(value?: string | null) {
  return value ? new Date(value).toLocaleString("en-IN") : "—";
}

function messageOf(value: unknown) {
  return value instanceof Error ? value.message : "The payout operation could not be completed.";
}

function statusClass(status: string) {
  if (status === "SUCCESS" || status === "CAPTURED") return "bg-emerald-50 text-emerald-700";
  if (status === "FAILED" || status === "RELEASED") return "bg-red-50 text-red-700";
  if (status === "UNKNOWN") return "bg-slate-100 text-slate-700";
  return "bg-amber-50 text-amber-800";
}

function shortReference(value: string) {
  return value.length > 20 ? `${value.slice(0, 11)}…${value.slice(-7)}` : value;
}

function isReconciliationItem(
  item: AdminPayoutSettlement | AdminPayoutReconciliation,
): item is AdminPayoutReconciliation {
  return "reconciliation" in item;
}

export function AdminPayoutOperations() {
  const actor = getAdminActor();
  const { can } = useEffectiveAccess();
  const allowed = (permission: string) =>
    actor?.kind === "SUPER_ADMIN" ||
    (actor?.kind === "IDENTITY_ADMIN" && can(permission, ["SUPER_ADMIN", "ADMIN"]));
  const canViewSettlements = allowed(UI_PERMISSION.PAYOUT_SETTLEMENT_VIEW_ALL);
  const canViewReconciliation = allowed(UI_PERMISSION.PAYOUT_RECONCILIATION_VIEW);
  const canResolveReconciliation = allowed(UI_PERMISSION.PAYOUT_RECONCILIATION_RESOLVE);

  const [view, setView] = useState<View>(canViewSettlements ? "settlements" : "reconciliation");
  const [settlements, setSettlements] = useState<AdminPayoutSettlement[]>([]);
  const [reconciliation, setReconciliation] = useState<AdminPayoutReconciliation[]>([]);
  const [providers, setProviders] = useState<ProviderRegistryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [detail, setDetail] = useState<AdminPayoutSettlement | null>(null);
  const [resolveTarget, setResolveTarget] = useState<AdminPayoutReconciliation | null>(null);

  const [settlementPage, setSettlementPage] = useState(1);
  const [settlementTotal, setSettlementTotal] = useState(0);
  const [settlementPages, setSettlementPages] = useState(0);
  const [settlementDraft, setSettlementDraft] = useState<AdminPayoutSettlementFilters>({});
  const [settlementFilters, setSettlementFilters] = useState<AdminPayoutSettlementFilters>({});

  const [reconciliationPage, setReconciliationPage] = useState(1);
  const [reconciliationTotal, setReconciliationTotal] = useState(0);
  const [reconciliationPages, setReconciliationPages] = useState(0);
  const [reconciliationIdentity, setReconciliationIdentity] = useState("");
  const [reconciliationStatus, setReconciliationStatus] = useState<
    "SUBMITTING" | "UNKNOWN" | "SUCCESS" | "FAILED" | ""
  >("");
  const [appliedReconciliation, setAppliedReconciliation] = useState({
    identityId: "",
    status: "",
  });

  const [resolution, setResolution] = useState<ResolvePayoutReconciliationInput>({
    resolution: "SUCCESS",
    reason: "",
    evidenceReference: "",
  });
  const providerLabelForCode = (providerCode: string) =>
    payoutProviderPublicName(providers.find((provider) => provider.publicCode === providerCode));
  const providerLabel = (item: AdminPayoutSettlement) =>
    payoutProviderPublicName(
      providers.find((provider) => provider.publicCode === item.providerCode) ?? item,
    );

  useEffect(() => {
    if (view === "settlements" && !canViewSettlements && canViewReconciliation) {
      setView("reconciliation");
    } else if (view === "reconciliation" && !canViewReconciliation && canViewSettlements) {
      setView("settlements");
    }
  }, [canViewReconciliation, canViewSettlements, view]);

  const loadSettlements = useCallback(async () => {
    if (!canViewSettlements) return;
    setLoading(true);
    setError("");
    try {
      const result = await adminApi.adminPayout.settlements.list({
        ...settlementFilters,
        page: settlementPage,
        limit: 20,
      });
      setSettlements(result.items);
      setSettlementTotal(result.pagination.total);
      setSettlementPages(result.pagination.totalPages);
    } catch (requestError) {
      setSettlements([]);
      setError(messageOf(requestError));
    } finally {
      setLoading(false);
    }
  }, [canViewSettlements, settlementFilters, settlementPage]);

  const loadReconciliation = useCallback(async () => {
    if (!canViewReconciliation) return;
    setLoading(true);
    setError("");
    try {
      const result = await adminApi.adminPayout.reconciliation.list({
        page: reconciliationPage,
        limit: 20,
        identityId: appliedReconciliation.identityId,
        status: appliedReconciliation.status as
          "SUBMITTING" | "UNKNOWN" | "SUCCESS" | "FAILED" | "",
      });
      setReconciliation(result.items);
      setReconciliationTotal(result.pagination.total);
      setReconciliationPages(result.pagination.totalPages);
    } catch (requestError) {
      setReconciliation([]);
      setError(messageOf(requestError));
    } finally {
      setLoading(false);
    }
  }, [appliedReconciliation, canViewReconciliation, reconciliationPage]);

  useEffect(() => {
    if (view === "settlements") void loadSettlements();
    else void loadReconciliation();
  }, [loadReconciliation, loadSettlements, view]);

  useEffect(() => {
    let cancelled = false;
    if (actor?.kind !== "SUPER_ADMIN") return;
    adminApi.superAdminPayout.providers
      .list()
      .then((items) => {
        if (!cancelled) setProviders(items);
      })
      .catch(() => {
        if (!cancelled) setProviders([]);
      });
    return () => {
      cancelled = true;
    };
  }, [actor?.kind]);

  function applySettlementFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      settlementDraft.fromDate &&
      settlementDraft.toDate &&
      settlementDraft.fromDate > settlementDraft.toDate
    ) {
      setError("From date cannot be after to date.");
      return;
    }
    setError("");
    setSettlementPage(1);
    setSettlementFilters(settlementDraft);
  }

  function applyReconciliationFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReconciliationPage(1);
    setAppliedReconciliation({
      identityId: reconciliationIdentity.trim(),
      status: reconciliationStatus,
    });
  }

  async function openDetail(settlementId: string) {
    if (!canViewSettlements) return;
    setDetailLoading(true);
    setError("");
    try {
      setDetail(await adminApi.adminPayout.settlements.get(settlementId));
    } catch (requestError) {
      setError(messageOf(requestError));
    } finally {
      setDetailLoading(false);
    }
  }

  function openResolution(item: AdminPayoutReconciliation) {
    setResolveTarget(item);
    setResolution({
      resolution: item.status === "FAILED" ? "FAILED" : "SUCCESS",
      reason: "",
      evidenceReference: "",
      providerTxnId: item.providerReference || undefined,
      rrn: item.rrn || undefined,
    });
    setError("");
  }

  async function submitResolution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resolveTarget || !canResolveReconciliation) return;
    if (resolution.reason.trim().length < 10) {
      setError("Resolution reason must contain at least 10 characters.");
      return;
    }
    if (!resolution.evidenceReference.trim()) {
      setError("Evidence reference is required.");
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");
    try {
      const updated = await adminApi.adminPayout.reconciliation.resolve(resolveTarget.id, {
        ...resolution,
        reason: resolution.reason.trim(),
        evidenceReference: resolution.evidenceReference.trim(),
        providerTxnId: resolution.providerTxnId?.trim() || undefined,
        rrn: resolution.rrn?.trim() || undefined,
        providerStatusCode: resolution.providerStatusCode?.trim() || undefined,
        providerStatusMessage: resolution.providerStatusMessage?.trim() || undefined,
      });
      setResolveTarget(null);
      setDetail(updated);
      setNotice(`Payout ${updated.merchantRefId} resolved as ${updated.status}.`);
      await loadReconciliation();
    } catch (requestError) {
      setError(messageOf(requestError));
    } finally {
      setBusy(false);
    }
  }

  if (!canViewSettlements && !canViewReconciliation) {
    return (
      <ActionPermissionNotice
        permission={`${UI_PERMISSION.PAYOUT_SETTLEMENT_VIEW_ALL} / ${UI_PERMISSION.PAYOUT_RECONCILIATION_VIEW}`}
        title="Payout operations are not enabled"
      />
    );
  }

  const page = view === "settlements" ? settlementPage : reconciliationPage;
  const totalPages = view === "settlements" ? settlementPages : reconciliationPages;
  const total = view === "settlements" ? settlementTotal : reconciliationTotal;
  const visibleItems: Array<AdminPayoutSettlement | AdminPayoutReconciliation> =
    view === "settlements" ? settlements : reconciliation;

  return (
    <section className="mb-6">
      {canViewSettlements ? (
        <PayoutOverviewPanel providerNameForCode={providerLabelForCode} />
      ) : null}

      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-2xl border border-border bg-white p-1">
          {canViewSettlements ? (
            <button
              type="button"
              onClick={() => setView("settlements")}
              className={`whitespace-nowrap rounded-xl px-5 py-3 text-sm font-black ${view === "settlements" ? "bg-secondary text-white" : "text-secondary"}`}
            >
              Payout settlements
            </button>
          ) : null}
          {canViewReconciliation ? (
            <button
              type="button"
              onClick={() => setView("reconciliation")}
              className={`whitespace-nowrap rounded-xl px-5 py-3 text-sm font-black ${view === "reconciliation" ? "bg-secondary text-white" : "text-secondary"}`}
            >
              Reconciliation queue
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void (view === "settlements" ? loadSettlements() : loadReconciliation())}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-bold disabled:opacity-50"
        >
          <RefreshCw className={loading ? "animate-spin" : ""} size={16} /> Refresh
        </button>
      </div>

      {error ? (
        <p className="mb-4 flex gap-2 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
          <CircleAlert className="shrink-0" size={18} /> {error}
        </p>
      ) : null}
      {notice ? (
        <p className="mb-4 flex gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
          <ShieldCheck className="shrink-0" size={18} /> {notice}
        </p>
      ) : null}

      <AdminPanel>
        {view === "settlements" ? (
          <form
            onSubmit={applySettlementFilters}
            className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
          >
            <input
              value={settlementDraft.identityId || ""}
              onChange={(event) =>
                setSettlementDraft((current) => ({ ...current, identityId: event.target.value }))
              }
              placeholder="Exact identity ID"
              className={inputClass}
            />
            <input
              value={settlementDraft.providerCode || ""}
              onChange={(event) =>
                setSettlementDraft((current) => ({ ...current, providerCode: event.target.value }))
              }
              placeholder="Provider code"
              className={inputClass}
            />
            <select
              value={settlementDraft.status || ""}
              onChange={(event) =>
                setSettlementDraft((current) => ({
                  ...current,
                  status: event.target.value as PayoutSettlementStatus | "",
                }))
              }
              className={inputClass}
            >
              {payoutStatuses.map((value) => (
                <option key={value || "ALL"} value={value}>
                  {value ? value.replaceAll("_", " ") : "All statuses"}
                </option>
              ))}
            </select>
            <select
              value={settlementDraft.paymentMode || ""}
              onChange={(event) =>
                setSettlementDraft((current) => ({
                  ...current,
                  paymentMode: event.target.value as "IMPS" | "NEFT" | "",
                }))
              }
              className={inputClass}
            >
              <option value="">All payment modes</option>
              <option value="IMPS">IMPS</option>
              <option value="NEFT">NEFT</option>
            </select>
            <label className="text-xs font-black uppercase text-secondary">
              From date
              <input
                type="date"
                value={settlementDraft.fromDate || ""}
                onChange={(event) =>
                  setSettlementDraft((current) => ({ ...current, fromDate: event.target.value }))
                }
                className={`mt-2 ${inputClass}`}
              />
            </label>
            <label className="text-xs font-black uppercase text-secondary">
              To date
              <input
                type="date"
                value={settlementDraft.toDate || ""}
                onChange={(event) =>
                  setSettlementDraft((current) => ({ ...current, toDate: event.target.value }))
                }
                className={`mt-2 ${inputClass}`}
              />
            </label>
            <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-white md:self-end">
              <Search size={16} /> Apply filters
            </button>
            <button
              type="button"
              onClick={() => {
                setSettlementDraft({});
                setSettlementFilters({});
                setSettlementPage(1);
              }}
              className="rounded-xl border border-border px-5 py-2.5 text-sm font-bold md:self-end"
            >
              Clear
            </button>
          </form>
        ) : (
          <form
            onSubmit={applyReconciliationFilters}
            className="grid gap-3 md:grid-cols-[1fr_240px_auto]"
          >
            <input
              value={reconciliationIdentity}
              onChange={(event) => setReconciliationIdentity(event.target.value)}
              placeholder="Exact identity ID"
              className={inputClass}
            />
            <select
              value={reconciliationStatus}
              onChange={(event) =>
                setReconciliationStatus(
                  event.target.value as "SUBMITTING" | "UNKNOWN" | "SUCCESS" | "FAILED" | "",
                )
              }
              className={inputClass}
            >
              <option value="">All reconciliation states</option>
              <option value="SUBMITTING">Submitting</option>
              <option value="UNKNOWN">Unknown</option>
              <option value="SUCCESS">Success / wallet mismatch</option>
              <option value="FAILED">Failed / wallet mismatch</option>
            </select>
            <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-white">
              <Search size={16} /> Apply filters
            </button>
          </form>
        )}

        <div className="mt-5 overflow-x-auto rounded-2xl border border-border">
          <table className="min-w-[1080px] w-full text-left text-sm">
            <thead className="bg-muted text-[11px] uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Reference</th>
                <th className="p-3">Identity</th>
                <th className="p-3">Provider</th>
                <th className="p-3">Mode</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Total debit</th>
                <th className="p-3">Status</th>
                <th className="p-3">Wallet</th>
                {view === "reconciliation" ? <th className="p-3">Issue</th> : null}
                <th className="p-3">Updated</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={view === "reconciliation" ? 11 : 10} className="p-12 text-center">
                    <Loader2 className="mx-auto animate-spin text-primary" />
                  </td>
                </tr>
              ) : visibleItems.length ? (
                visibleItems.map((item) => {
                  const queueItem = isReconciliationItem(item) ? item : null;
                  const failureDescription = payoutFailureDescription(item);
                  const npciCode = payoutFailureNpciCode(item);
                  return (
                    <tr key={item.id} className="border-t border-border">
                      <td className="p-3 font-bold" title={item.merchantRefId}>
                        {shortReference(item.merchantRefId)}
                      </td>
                      <td className="p-3 text-xs" title={item.identityId}>
                        {shortReference(item.identityId)}
                      </td>
                      <td className="p-3">{providerLabel(item)}</td>
                      <td className="p-3">
                        <span className="font-bold">{item.paymentMode}</span>
                        <span className="mt-0.5 block text-[10px] text-muted-foreground">
                          {item.sourceWallet} wallet
                        </span>
                      </td>
                      <td className="p-3 font-bold">{money.format(Number(item.amount))}</td>
                      <td className="p-3 font-bold">
                        {money.format(Number(item.totalWalletDebit))}
                      </td>
                      <td className="p-3">
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-black ${statusClass(item.status)}`}
                        >
                          {item.status.replaceAll("_", " ")}
                        </span>
                        {failureDescription ? (
                          <span className="mt-2 block max-w-64 text-xs font-semibold text-red-700">
                            {failureDescription}
                          </span>
                        ) : null}
                        {npciCode ? (
                          <span className="mt-1 block text-[10px] font-bold text-red-600">
                            NPCI code: {npciCode}
                          </span>
                        ) : null}
                      </td>
                      <td className="p-3">
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-black ${statusClass(item.walletState)}`}
                        >
                          {item.walletState.replaceAll("_", " ")}
                        </span>
                      </td>
                      {view === "reconciliation" ? (
                        <td className="max-w-56 p-3 text-xs">
                          {queueItem?.reconciliation.reason.replaceAll("_", " ")}
                        </td>
                      ) : null}
                      <td className="p-3 text-xs">{formatTime(item.updatedAt)}</td>
                      <td className="p-3">
                        <div className="flex justify-end gap-2">
                          {canViewSettlements ? (
                            <button
                              type="button"
                              onClick={() => void openDetail(item.id)}
                              disabled={detailLoading}
                              className="grid h-9 w-9 place-items-center rounded-xl border border-border disabled:opacity-50"
                              title="View details"
                              aria-label={`View ${item.merchantRefId}`}
                            >
                              <Eye size={16} />
                            </button>
                          ) : null}
                          {queueItem && canResolveReconciliation ? (
                            <button
                              type="button"
                              onClick={() => openResolution(queueItem)}
                              className="inline-flex h-9 items-center gap-2 rounded-xl border border-primary px-3 text-xs font-black text-primary"
                            >
                              <FileCheck2 size={15} /> Resolve
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={view === "reconciliation" ? 11 : 10}
                    className="p-12 text-center text-muted-foreground"
                  >
                    No payout records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-muted-foreground">{total} record(s)</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={loading || page <= 1}
              onClick={() =>
                view === "settlements"
                  ? setSettlementPage((value) => Math.max(1, value - 1))
                  : setReconciliationPage((value) => Math.max(1, value - 1))
              }
              className="rounded-xl border border-border px-4 py-2 font-bold disabled:opacity-40"
            >
              Previous
            </button>
            <span className="font-bold">
              Page {page} of {Math.max(totalPages, 1)}
            </span>
            <button
              type="button"
              disabled={loading || totalPages === 0 || page >= totalPages}
              onClick={() =>
                view === "settlements"
                  ? setSettlementPage((value) => value + 1)
                  : setReconciliationPage((value) => value + 1)
              }
              className="rounded-xl border border-border px-4 py-2 font-bold disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </AdminPanel>

      {detail ? (
        <PayoutDetailDialog
          detail={detail}
          providerLabel={providerLabel(detail)}
          onClose={() => setDetail(null)}
        />
      ) : null}

      {resolveTarget ? (
        <div className="fixed inset-0 z-[130] grid place-items-center bg-secondary/65 p-4 backdrop-blur-sm">
          <form
            onSubmit={submitResolution}
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase text-primary">Manual reconciliation</p>
                <h2 className="mt-1 text-xl font-black text-secondary">
                  Resolve {shortReference(resolveTarget.merchantRefId)}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setResolveTarget(null)}
                disabled={busy}
                className="grid h-10 w-10 place-items-center rounded-xl border border-border"
                aria-label="Close reconciliation"
              >
                <X size={18} />
              </button>
            </div>

            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
              Confirm the provider/bank evidence first. This finalizes canonical payout and wallet
              state; it never submits another provider payout.
            </p>

            {error ? (
              <p className="mt-4 flex gap-2 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
                <CircleAlert className="shrink-0" size={18} /> {error}
              </p>
            ) : null}

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-black uppercase text-secondary">
                Final resolution
                <select
                  value={resolution.resolution}
                  onChange={(event) =>
                    setResolution((current) => ({
                      ...current,
                      resolution: event.target.value as "SUCCESS" | "FAILED",
                    }))
                  }
                  className={`mt-2 ${inputClass}`}
                >
                  <option value="SUCCESS">SUCCESS</option>
                  <option value="FAILED">FAILED</option>
                </select>
              </label>
              <label className="text-xs font-black uppercase text-secondary">
                Evidence reference
                <input
                  required
                  maxLength={200}
                  value={resolution.evidenceReference}
                  onChange={(event) =>
                    setResolution((current) => ({
                      ...current,
                      evidenceReference: event.target.value,
                    }))
                  }
                  placeholder="Provider dashboard / ticket reference"
                  className={`mt-2 ${inputClass}`}
                />
              </label>
              <label className="text-xs font-black uppercase text-secondary sm:col-span-2">
                Resolution reason
                <textarea
                  required
                  minLength={10}
                  maxLength={500}
                  rows={3}
                  value={resolution.reason}
                  onChange={(event) =>
                    setResolution((current) => ({ ...current, reason: event.target.value }))
                  }
                  placeholder="Minimum 10 characters explaining the verified evidence"
                  className={`mt-2 ${inputClass}`}
                />
              </label>
              <label className="text-xs font-black uppercase text-secondary">
                Provider transaction ID
                <input
                  maxLength={150}
                  value={resolution.providerTxnId || ""}
                  onChange={(event) =>
                    setResolution((current) => ({
                      ...current,
                      providerTxnId: event.target.value,
                    }))
                  }
                  className={`mt-2 ${inputClass}`}
                />
              </label>
              <label className="text-xs font-black uppercase text-secondary">
                RRN
                <input
                  maxLength={100}
                  value={resolution.rrn || ""}
                  onChange={(event) =>
                    setResolution((current) => ({ ...current, rrn: event.target.value }))
                  }
                  className={`mt-2 ${inputClass}`}
                />
              </label>
              <label className="text-xs font-black uppercase text-secondary">
                Provider status code
                <input
                  maxLength={20}
                  value={resolution.providerStatusCode || ""}
                  onChange={(event) =>
                    setResolution((current) => ({
                      ...current,
                      providerStatusCode: event.target.value,
                    }))
                  }
                  className={`mt-2 ${inputClass}`}
                />
              </label>
              <label className="text-xs font-black uppercase text-secondary">
                Provider status message
                <input
                  maxLength={500}
                  value={resolution.providerStatusMessage || ""}
                  onChange={(event) =>
                    setResolution((current) => ({
                      ...current,
                      providerStatusMessage: event.target.value,
                    }))
                  }
                  className={`mt-2 ${inputClass}`}
                />
              </label>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setResolveTarget(null)}
                disabled={busy}
                className="rounded-xl border border-border py-3 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                disabled={busy}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-black text-white disabled:opacity-50"
              >
                {busy ? <Loader2 className="animate-spin" size={17} /> : <ShieldCheck size={17} />}
                Confirm resolution
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}

const overviewRanges: Array<{ value: Exclude<AdminPayoutOverviewRange, "CUSTOM">; label: string }> =
  [
    { value: "LAST_30_MINUTES", label: "30 min" },
    { value: "LAST_1_HOUR", label: "1 hour" },
    { value: "LAST_2_HOURS", label: "2 hours" },
    { value: "LAST_4_HOURS", label: "4 hours" },
    { value: "LAST_6_HOURS", label: "6 hours" },
    { value: "LAST_10_HOURS", label: "10 hours" },
    { value: "LAST_24_HOURS", label: "24 hours" },
  ];

function PayoutOverviewPanel({
  providerNameForCode,
}: {
  providerNameForCode: (providerCode: string) => string;
}) {
  const [overview, setOverview] = useState<AdminPayoutOverview | null>(null);
  const [draft, setDraft] = useState<AdminPayoutOverviewFilters>({ range: "LAST_24_HOURS" });
  const [applied, setApplied] = useState<AdminPayoutOverviewFilters>({
    range: "LAST_24_HOURS",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setOverview(await adminApi.adminPayout.settlements.overview(applied));
    } catch (requestError) {
      setOverview(null);
      setError(messageOf(requestError));
    } finally {
      setLoading(false);
    }
  }, [applied]);

  useEffect(() => {
    void load();
  }, [load]);

  function chooseRange(range: Exclude<AdminPayoutOverviewRange, "CUSTOM">) {
    const next = { ...draft, range, fromDate: undefined, toDate: undefined };
    setDraft(next);
    setApplied(next);
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft.range === "CUSTOM") {
      if (!draft.fromDate || !draft.toDate) {
        setError("Select both start and end date/time for a custom range.");
        return;
      }
      const from = new Date(draft.fromDate);
      const to = new Date(draft.toDate);
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
        setError("Enter a valid custom range; start must be before end.");
        return;
      }
      setApplied({ ...draft, fromDate: from.toISOString(), toDate: to.toISOString() });
    } else {
      setApplied({ ...draft, fromDate: undefined, toDate: undefined });
    }
    setError("");
  }

  return (
    <AdminPanel className="mb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <BarChart3 size={21} />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-primary">
              Payout monitoring
            </p>
            <h2 className="mt-1 text-xl font-black text-secondary">Settlement volume overview</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Live payout volume, success rate, wallet debit and reconciliation exposure.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold disabled:opacity-50"
        >
          <RefreshCw className={loading ? "animate-spin" : ""} size={16} /> Refresh overview
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {overviewRanges.map((range) => (
          <button
            key={range.value}
            type="button"
            onClick={() => chooseRange(range.value)}
            className={`rounded-xl border px-3 py-2 text-xs font-black ${draft.range === range.value ? "border-secondary bg-secondary text-white" : "border-border bg-white text-secondary"}`}
          >
            {range.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setDraft((current) => ({ ...current, range: "CUSTOM" }))}
          className={`rounded-xl border px-3 py-2 text-xs font-black ${draft.range === "CUSTOM" ? "border-secondary bg-secondary text-white" : "border-border bg-white text-secondary"}`}
        >
          Custom
        </button>
      </div>

      <form onSubmit={applyFilters} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <input
          value={draft.identityId || ""}
          onChange={(event) =>
            setDraft((current) => ({ ...current, identityId: event.target.value }))
          }
          placeholder="Exact identity ID"
          className={inputClass}
        />
        <input
          value={draft.providerCode || ""}
          onChange={(event) =>
            setDraft((current) => ({ ...current, providerCode: event.target.value }))
          }
          placeholder="Provider code"
          className={inputClass}
        />
        <select
          value={draft.paymentMode || ""}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              paymentMode: event.target.value as "IMPS" | "NEFT" | "",
            }))
          }
          className={inputClass}
        >
          <option value="">All payment modes</option>
          <option value="IMPS">IMPS</option>
          <option value="NEFT">NEFT</option>
        </select>
        <select
          value={draft.sourceWallet || ""}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              sourceWallet: event.target.value as "AEPS" | "MAIN" | "",
            }))
          }
          className={inputClass}
        >
          <option value="">All source wallets</option>
          <option value="AEPS">AEPS wallet</option>
          <option value="MAIN">MAIN wallet</option>
        </select>

        {draft.range === "CUSTOM" ? (
          <>
            <label className="text-xs font-black uppercase text-secondary">
              From date & time
              <input
                required
                type="datetime-local"
                value={draft.fromDate || ""}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, fromDate: event.target.value }))
                }
                className={`mt-2 ${inputClass}`}
              />
            </label>
            <label className="text-xs font-black uppercase text-secondary">
              To date & time
              <input
                required
                type="datetime-local"
                value={draft.toDate || ""}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, toDate: event.target.value }))
                }
                className={`mt-2 ${inputClass}`}
              />
            </label>
          </>
        ) : null}

        <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-white xl:col-span-2">
          <Search size={16} /> Apply overview filters
        </button>
      </form>

      {error ? (
        <p className="mt-4 flex gap-2 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
          <CircleAlert className="shrink-0" size={18} /> {error}
        </p>
      ) : null}

      {loading ? (
        <div className="grid min-h-48 place-items-center">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      ) : overview ? (
        <>
          <p className="mt-4 text-xs text-muted-foreground">
            {formatTime(overview.range.fromDate)} to {formatTime(overview.range.toDate)} · Generated{" "}
            {formatTime(overview.generatedAt)}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Transactions", String(overview.totals.transactions)],
              ["Requested volume", money.format(Number(overview.totals.requestedVolume))],
              ["Successful volume", money.format(Number(overview.totals.successfulVolume))],
              ["Pending volume", money.format(Number(overview.totals.pendingVolume))],
              [
                "Successful wallet debit",
                money.format(Number(overview.totals.successfulWalletDebit)),
              ],
              ["Platform surcharge", money.format(Number(overview.totals.successfulSurcharge))],
              ["Success rate", `${overview.totals.successRate.toFixed(2)}%`],
              ["Needs reconciliation", String(overview.totals.reconciliationRequired)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-muted p-4">
                <p className="text-[10px] font-black uppercase text-muted-foreground">{label}</p>
                <p className="mt-2 text-xl font-black text-secondary">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            <OverviewBreakdown
              title="Providers"
              items={overview.providers.map((item) => ({
                ...item,
                label: providerNameForCode(item.providerCode),
              }))}
            />
            <OverviewBreakdown
              title="Payment modes"
              items={overview.paymentModes.map((item) => ({ ...item, label: item.paymentMode }))}
            />
            <OverviewBreakdown
              title="Source wallets"
              items={overview.sourceWallets.map((item) => ({ ...item, label: item.sourceWallet }))}
            />
          </div>
        </>
      ) : null}
    </AdminPanel>
  );
}

function OverviewBreakdown({
  title,
  items,
}: {
  title: string;
  items: Array<{
    label: string;
    total: number;
    successful: number;
    failed: number;
    pending: number;
    volume: string;
  }>;
}) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <h3 className="font-black text-secondary">{title}</h3>
      <div className="mt-3 space-y-2">
        {items.length ? (
          items.map((item) => (
            <div key={item.label} className="rounded-xl bg-muted p-3">
              <div className="flex items-center justify-between gap-3">
                <strong className="text-sm text-secondary">{item.label}</strong>
                <strong className="text-sm text-secondary">
                  {money.format(Number(item.volume))}
                </strong>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {item.total} total · {item.successful} success · {item.pending} pending ·{" "}
                {item.failed} failed
              </p>
            </div>
          ))
        ) : (
          <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
            No volume in this range.
          </p>
        )}
      </div>
    </div>
  );
}

function PayoutDetailDialog({
  detail,
  providerLabel,
  onClose,
}: {
  detail: AdminPayoutSettlement;
  providerLabel: string;
  onClose: () => void;
}) {
  const failureDescription = payoutFailureDescription(detail);
  const npciCode = payoutFailureNpciCode(detail);
  const fields = [
    ["Identity ID", detail.identityId],
    ["Settlement UUID", detail.id],
    ["Merchant reference", detail.merchantRefId],
    ["Status", detail.status.replaceAll("_", " ")],
    ["Wallet state", detail.walletState.replaceAll("_", " ")],
    ["Provider", providerLabel],
    ["Provider reference", detail.providerReference || "—"],
    ["RRN", detail.rrn || "—"],
    ["Payment mode", detail.paymentMode],
    ["Source wallet", detail.sourceWallet],
    ["Bank account", detail.bankAccount?.last4 ? `•••• ${detail.bankAccount.last4}` : "—"],
    ["Payout amount", money.format(Number(detail.amount))],
    ["Surcharge", money.format(Number(detail.surcharge.amount))],
    ["Total wallet debit", money.format(Number(detail.totalWalletDebit))],
    ["Created", formatTime(detail.createdAt)],
    ["Updated", formatTime(detail.updatedAt)],
    ["Queued", formatTime(detail.timeline.queuedAt)],
    ["Callback received", formatTime(detail.timeline.callbackReceivedAt)],
    ["Completed", formatTime(detail.timeline.completedAt)],
  ];

  return (
    <div className="fixed inset-0 z-[125] grid place-items-center bg-secondary/65 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-primary">Payout settlement detail</p>
            <h2 className="mt-1 break-all text-xl font-black text-secondary">
              {detail.merchantRefId}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border"
            aria-label="Close payout detail"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-muted p-4">
              <p className="text-[10px] font-black uppercase text-muted-foreground">{label}</p>
              <p className="mt-1 break-all text-sm font-extrabold text-secondary">{value}</p>
            </div>
          ))}
        </div>
        {failureDescription ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p className="font-black">Failure reason</p>
            <p className="mt-1">{failureDescription}</p>
            {npciCode ? <p className="mt-1 text-xs font-bold">NPCI code: {npciCode}</p> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
