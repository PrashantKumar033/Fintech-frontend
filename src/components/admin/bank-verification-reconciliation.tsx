import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { AdminPanel } from "@/components/admin/admin-layout";
import { Pagination, ResolutionDialog } from "@/components/admin/super-admin-aeps-two-factor";
import {
  adminApi,
  type BankVerificationReconciliationItem,
  type ReconciliationAction,
} from "@/lib/admin-api";

const control =
  "rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-primary";
const messageOf = (value: unknown) =>
  value instanceof Error
    ? value.message
    : "The bank reconciliation request could not be completed.";

export function BankVerificationReconciliation() {
  const [items, setItems] = useState<BankVerificationReconciliationItem[]>([]);
  const [identityId, setIdentityId] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<BankVerificationReconciliationItem | null>(null);
  const [action, setAction] = useState<ReconciliationAction>("RECONCILE_DEBIT");
  const [reason, setReason] = useState("");
  const [providerTxnId, setProviderTxnId] = useState("");
  const [providerCode, setProviderCode] = useState("");
  const [providerMessage, setProviderMessage] = useState("");
  const [accountHolder, setAccountHolder] = useState("");

  const load = useCallback(
    async (targetPage = 1) => {
      setLoading(true);
      setError("");
      try {
        const query = new URLSearchParams({ page: String(targetPage), limit: "20" });
        if (identityId.trim()) query.set("identityId", identityId.trim());
        const result = await adminApi.bankVerificationReconciliation.list(query.toString());
        setItems(result.items || []);
        setPage(result.page || targetPage);
        setPages(Math.max(result.totalPages || 1, 1));
        setTotal(result.total || 0);
      } catch (value) {
        setError(messageOf(value));
      } finally {
        setLoading(false);
      }
    },
    [identityId],
  );

  useEffect(() => void load(1), [load]);

  function open(item: BankVerificationReconciliationItem) {
    setSelected(item);
    setAction("RECONCILE_DEBIT");
    setReason("");
    setProviderTxnId(item.providerTxnId || "");
    setProviderCode(item.providerStatusCode || "");
    setProviderMessage(item.providerStatusMessage || "");
    setAccountHolder(item.accountHolderName || "");
    setError("");
  }

  async function resolve(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    if (!reason.trim()) return setError("Enter a reconciliation reason.");
    if (action === "CONFIRM_PROVIDER_SUCCESS" && (!providerTxnId.trim() || !accountHolder.trim()))
      return setError("Provider transaction ID and account holder are required for success.");
    setBusy(true);
    setError("");
    try {
      await adminApi.bankVerificationReconciliation.resolve(selected.id, {
        action,
        reason: reason.trim(),
        providerTxnId: providerTxnId.trim() || undefined,
        providerStatusCode:
          (action === "CONFIRM_PROVIDER_SUCCESS"
            ? providerCode.trim() || "000"
            : providerCode.trim()) || undefined,
        providerStatusMessage: providerMessage.trim() || undefined,
        accountHolderName: accountHolder.trim() || undefined,
      });
      setSelected(null);
      setNotice("Bank verification reconciliation completed.");
      await load(page);
    } catch (value) {
      setError(messageOf(value));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
          {notice}
        </p>
      ) : null}
      <AdminPanel>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">Verification reconciliation</h2>
            <p className="text-sm text-muted-foreground">
              {total} bank verification attempts require review.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              value={identityId}
              onChange={(e) => setIdentityId(e.target.value)}
              className={control}
              placeholder="Identity UUID (optional)"
            />
            <button
              type="button"
              onClick={() => void load(1)}
              className={`${control} cursor-pointer`}
              title="Refresh"
            >
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
              <tr>
                {[
                  "Member",
                  "Account",
                  "Provider",
                  "Status",
                  "Fee state",
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
                  <td colSpan={8} className="h-36 text-center">
                    <Loader2 className="mx-auto animate-spin text-primary" />
                  </td>
                </tr>
              ) : items.length ? (
                items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-mono text-xs">{item.identityId || "—"}</td>
                    <td className="px-4 py-3">
                      <strong>••••{item.accountNumberLast4 || "—"}</strong>
                      <p className="text-xs text-muted-foreground">{item.ifsc || "—"}</p>
                    </td>
                    <td className="px-4 py-3">{item.provider}</td>
                    <td className="px-4 py-3">{item.status}</td>
                    <td className="px-4 py-3">{item.feeStatus || "—"}</td>
                    <td className="px-4 py-3 text-xs">{item.providerTxnId || item.clientRefId}</td>
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
                  <td colSpan={8} className="h-36 text-center text-muted-foreground">
                    No bank verification attempts need reconciliation.
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
          title="Resolve bank verification"
          busy={busy}
          action={action}
          setAction={setAction}
          reason={reason}
          setReason={setReason}
          providerRef={providerTxnId}
          setProviderRef={setProviderTxnId}
          providerCode={providerCode}
          setProviderCode={setProviderCode}
          providerMessage={providerMessage}
          setProviderMessage={setProviderMessage}
          accountHolder={accountHolder}
          setAccountHolder={setAccountHolder}
          close={() => setSelected(null)}
          submit={resolve}
        />
      ) : null}
    </div>
  );
}
