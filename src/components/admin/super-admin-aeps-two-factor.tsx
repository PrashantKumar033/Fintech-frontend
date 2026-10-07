import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, RefreshCw, Settings2, X } from "lucide-react";
import { AdminPanel } from "@/components/admin/admin-layout";
import {
  adminApi,
  type AepsTwoFactorReconciliationItem,
  type ReconciliationAction,
} from "@/lib/admin-api";

const field =
  "w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-primary";
const actions: ReconciliationAction[] = [
  "RECONCILE_DEBIT",
  "CONFIRM_PROVIDER_SUCCESS",
  "CONFIRM_PROVIDER_FAILED",
  "RETRY_REVERSAL",
];
const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : "The AEPS 2FA request could not be completed.";
const DEFAULT_PROVIDER = "PROVIDER_1";

export function SuperAdminAepsTwoFactor() {
  const [provider, setProvider] = useState(DEFAULT_PROVIDER);
  const [fee, setFee] = useState("");
  const [feeReason, setFeeReason] = useState("");
  const [items, setItems] = useState<AepsTwoFactorReconciliationItem[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [identityId, setIdentityId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<AepsTwoFactorReconciliationItem | null>(null);
  const [action, setAction] = useState<ReconciliationAction>("RECONCILE_DEBIT");
  const [reason, setReason] = useState("");
  const [providerTxnRefId, setProviderTxnRefId] = useState("");
  const [providerStatusCode, setProviderStatusCode] = useState("");
  const [providerStatusMessage, setProviderStatusMessage] = useState("");

  const load = useCallback(
    async (targetPage = 1) => {
      setLoading(true);
      setError("");
      try {
        const providerCode = await adminApi.operations
          .aepsProviderStatus()
          .then((providerStatus) => {
            const activeProvider =
              providerStatus.providers.find((item) => item.status !== "DISABLED") ||
              providerStatus.providers[0];
            return activeProvider?.provider || DEFAULT_PROVIDER;
          })
          .catch(() => DEFAULT_PROVIDER);
        setProvider(providerCode);
        const query = new URLSearchParams({
          provider: providerCode,
          page: String(targetPage),
          limit: "20",
        });
        if (identityId.trim()) query.set("identityId", identityId.trim());
        const [configuration, queue] = await Promise.all([
          adminApi.superAdminAeps.twoFactorFee(providerCode),
          adminApi.superAdminAeps.twoFactorReconciliation(query.toString()),
        ]);
        setFee(String(configuration.feeAmount ?? ""));
        setItems(queue.items || []);
        setPage(queue.page || targetPage);
        setPages(Math.max(queue.totalPages || 1, 1));
        setTotal(queue.total || 0);
      } catch (value) {
        setError(messageOf(value));
      } finally {
        setLoading(false);
      }
    },
    [identityId],
  );

  useEffect(() => void load(1), [load]);

  async function saveFee(event: FormEvent) {
    event.preventDefault();
    const amount = Number(fee);
    if (!Number.isFinite(amount) || amount <= 0)
      return setError("Enter a valid fee greater than zero.");
    if (!feeReason.trim()) return setError("Enter the reason for changing the fee.");
    setBusy(true);
    setError("");
    try {
      await adminApi.superAdminAeps.updateTwoFactorFee(provider, amount, feeReason.trim());
      setFeeReason("");
      setNotice(`${provider} 2FA fee configuration updated.`);
      await load(page);
    } catch (value) {
      setError(messageOf(value));
    } finally {
      setBusy(false);
    }
  }

  async function resolve(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    if (!reason.trim()) return setError("Enter a reconciliation reason.");
    if (action === "CONFIRM_PROVIDER_SUCCESS" && !providerTxnRefId.trim())
      return setError("Provider transaction reference is required for a successful confirmation.");
    setBusy(true);
    setError("");
    try {
      await adminApi.superAdminAeps.resolveTwoFactor(selected.id, {
        action,
        reason: reason.trim(),
        providerTxnRefId: providerTxnRefId.trim() || undefined,
        providerStatusCode: providerStatusCode.trim() || undefined,
        providerStatusMessage: providerStatusMessage.trim() || undefined,
      });
      setSelected(null);
      setNotice("2FA reconciliation action completed.");
      await load(page);
    } catch (value) {
      setError(messageOf(value));
    } finally {
      setBusy(false);
    }
  }

  function open(item: AepsTwoFactorReconciliationItem) {
    setSelected(item);
    setAction("RECONCILE_DEBIT");
    setReason("");
    setProviderTxnRefId(item.providerTxnRefId || "");
    setProviderStatusCode(item.providerStatusCode || "");
    setProviderStatusMessage(item.providerStatusMessage || "");
    setError("");
  }

  return (
    <div className="space-y-5">
      {error ? <Banner tone="error">{error}</Banner> : null}
      {notice ? <Banner tone="success">{notice}</Banner> : null}
      <AdminPanel>
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
            <Settings2 size={20} />
          </span>
          <div>
            <h2 className="text-xl font-black">{provider} daily 2FA fee</h2>
            <p className="text-sm text-muted-foreground">
              Audited fee configuration used by the backend 2FA flow.
            </p>
          </div>
        </div>
        <form onSubmit={saveFee} className="mt-5 grid gap-3 md:grid-cols-[180px_1fr_auto]">
          <label className="text-xs font-black">
            FEE AMOUNT (INR)
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              className={`${field} mt-2`}
            />
          </label>
          <label className="text-xs font-black">
            CHANGE REASON
            <input
              value={feeReason}
              onChange={(e) => setFeeReason(e.target.value)}
              maxLength={500}
              className={`${field} mt-2`}
              placeholder="Required for audit"
            />
          </label>
          <button
            disabled={busy}
            className="mt-auto cursor-pointer rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save fee
          </button>
        </form>
      </AdminPanel>
      <AdminPanel>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">2FA reconciliation</h2>
            <p className="text-sm text-muted-foreground">
              {total} attempts require operational review.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              value={identityId}
              onChange={(e) => setIdentityId(e.target.value)}
              className={field}
              placeholder="Identity UUID (optional)"
            />
            <button
              type="button"
              onClick={() => void load(1)}
              className={`${field} cursor-pointer`}
            >
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
              <tr>
                {[
                  "Identity",
                  "Business date",
                  "Status",
                  "Fee",
                  "Provider reference",
                  "Failure",
                  "Action",
                ].map((v) => (
                  <th key={v} className="px-4 py-3">
                    {v}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="h-36 text-center">
                    <Loader2 className="mx-auto animate-spin text-primary" />
                  </td>
                </tr>
              ) : items.length ? (
                items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-mono text-xs">
                      {item.day?.profile?.identityId || "—"}
                    </td>
                    <td className="px-4 py-3">{date(item.day?.businessDate)}</td>
                    <td className="px-4 py-3">
                      <Badge value={item.status} />
                    </td>
                    <td className="px-4 py-3">₹{item.feeAmount ?? "—"}</td>
                    <td className="px-4 py-3 text-xs">
                      {item.providerTxnRefId || item.providerMerchantRefId || "—"}
                    </td>
                    <td className="max-w-xs px-4 py-3 text-xs text-red-700">
                      {item.failureReason || item.providerStatusMessage || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => open(item)}
                        className="cursor-pointer rounded-lg border border-border px-3 py-2 font-bold"
                      >
                        Resolve
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="h-36 text-center text-muted-foreground">
                    No 2FA reconciliation attempts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pages={pages} loading={loading} load={load} />
      </AdminPanel>
      {selected ? (
        <ResolutionDialog
          title="Resolve AEPS 2FA attempt"
          busy={busy}
          action={action}
          setAction={setAction}
          reason={reason}
          setReason={setReason}
          providerRef={providerTxnRefId}
          setProviderRef={setProviderTxnRefId}
          providerCode={providerStatusCode}
          setProviderCode={setProviderStatusCode}
          providerMessage={providerStatusMessage}
          setProviderMessage={setProviderStatusMessage}
          close={() => setSelected(null)}
          submit={resolve}
        />
      ) : null}
    </div>
  );
}

export function ResolutionDialog({
  title,
  busy,
  action,
  setAction,
  reason,
  setReason,
  providerRef,
  setProviderRef,
  providerCode,
  setProviderCode,
  providerMessage,
  setProviderMessage,
  accountHolder,
  setAccountHolder,
  close,
  submit,
}: {
  title: string;
  busy: boolean;
  action: ReconciliationAction;
  setAction: (value: ReconciliationAction) => void;
  reason: string;
  setReason: (value: string) => void;
  providerRef: string;
  setProviderRef: (value: string) => void;
  providerCode: string;
  setProviderCode: (value: string) => void;
  providerMessage: string;
  setProviderMessage: (value: string) => void;
  accountHolder?: string;
  setAccountHolder?: (value: string) => void;
  close: () => void;
  submit: (event: FormEvent) => void;
}) {
  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-secondary/60 p-4">
      <form
        onSubmit={submit}
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex justify-between">
          <div>
            <p className="text-xs font-black uppercase text-primary">Audited action</p>
            <h2 className="text-xl font-black">{title}</h2>
          </div>
          <button
            type="button"
            onClick={close}
            className="cursor-pointer rounded-xl border border-border p-2"
          >
            <X />
          </button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-black">
            ACTION
            <select
              value={action}
              onChange={(e) => setAction(e.target.value as ReconciliationAction)}
              className={`${field} mt-2`}
            >
              {actions.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-black">
            PROVIDER REFERENCE
            <input
              value={providerRef}
              onChange={(e) => setProviderRef(e.target.value)}
              className={`${field} mt-2`}
            />
          </label>
          {setAccountHolder ? (
            <label className="text-xs font-black">
              ACCOUNT HOLDER
              <input
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                className={`${field} mt-2`}
              />
            </label>
          ) : null}
          <label className="text-xs font-black">
            PROVIDER CODE
            <input
              value={providerCode}
              onChange={(e) => setProviderCode(e.target.value)}
              className={`${field} mt-2`}
            />
          </label>
          <label className="text-xs font-black sm:col-span-2">
            PROVIDER MESSAGE
            <input
              value={providerMessage}
              onChange={(e) => setProviderMessage(e.target.value)}
              className={`${field} mt-2`}
            />
          </label>
          <label className="text-xs font-black sm:col-span-2">
            REASON
            <textarea
              required
              maxLength={500}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={`${field} mt-2 resize-none`}
            />
          </label>
        </div>
        <button
          disabled={busy}
          className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 className="animate-spin" size={17} /> : <CheckCircle2 size={17} />}
          Confirm resolution
        </button>
      </form>
    </div>
  );
}

export function Pagination({
  page,
  pages,
  loading,
  load,
}: {
  page: number;
  pages: number;
  loading: boolean;
  load: (page: number) => Promise<void>;
}) {
  return (
    <div className="mt-4 flex items-center justify-between text-xs font-bold">
      <span>
        Page {page} of {pages}
      </span>
      <div className="flex gap-2">
        <button
          disabled={loading || page <= 1}
          onClick={() => void load(page - 1)}
          className={`${field} cursor-pointer disabled:cursor-not-allowed`}
        >
          Previous
        </button>
        <button
          disabled={loading || page >= pages}
          onClick={() => void load(page + 1)}
          className={`${field} cursor-pointer disabled:cursor-not-allowed`}
        >
          Next
        </button>
      </div>
    </div>
  );
}
function Badge({ value }: { value: string }) {
  return (
    <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-800">
      {value.replaceAll("_", " ")}
    </span>
  );
}
function Banner({ tone, children }: { tone: "error" | "success"; children: React.ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : undefined}
      className={`rounded-xl p-3 text-sm font-semibold ${tone === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
    >
      {children}
    </p>
  );
}
function date(value?: string) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("en-IN");
}
