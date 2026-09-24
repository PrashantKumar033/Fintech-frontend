import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Eye, RefreshCw, ShieldAlert, X } from "lucide-react";
import { adminApi, getAdminActor, type AdminFundHold } from "@/lib/admin-api";

type Action = "credit-main" | "credit-aeps" | "deduct" | "aeps-transfer" | "hold";

const input =
  "w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none focus:border-primary";
const emptyForm = { targetLoginId: "", sourceLoginId: "", amount: "", reason: "", tpin: "" };

function operationKey() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `admin-wallet-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function WalletFinancialControls() {
  const isSuperAdmin = getAdminActor()?.kind === "SUPER_ADMIN";
  const [action, setAction] = useState<Action>("credit-main");
  const [form, setForm] = useState(emptyForm);
  const [holds, setHolds] = useState<AdminFundHold[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [selectedHold, setSelectedHold] = useState<AdminFundHold | null>(null);

  async function loadHolds() {
    if (!isSuperAdmin) return;
    try {
      const page = await adminApi.operations.fundHolds();
      setHolds(page.items || page.data || []);
    } catch (error) {
      setNotice({
        ok: false,
        text: error instanceof Error ? error.message : "Wallet holds could not be loaded.",
      });
    }
  }

  useEffect(() => {
    void loadHolds(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [isSuperAdmin]);

  if (!isSuperAdmin) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount < 0.01) {
      setNotice({ ok: false, text: "Enter an amount of at least ₹0.01." });
      return;
    }
    if (!/^\d{4,6}$/.test(form.tpin)) {
      setNotice({ ok: false, text: "TPIN must contain 4 to 6 digits." });
      return;
    }
    if (action === "aeps-transfer" && form.sourceLoginId.trim() === form.targetLoginId.trim()) {
      setNotice({ ok: false, text: "Source and target Login IDs must be different." });
      return;
    }
    setBusy(true);
    setNotice(null);
    const body = {
      targetLoginId: form.targetLoginId.trim(),
      amount,
      reason: form.reason.trim(),
      tpin: form.tpin,
    };
    try {
      if (action === "credit-main" || action === "credit-aeps") {
        await adminApi.operations.manualWalletCredit(
          action === "credit-main" ? "main" : "aeps",
          body,
          operationKey(),
        );
      } else if (action === "deduct") {
        await adminApi.operations.directWalletDeduct(body, operationKey());
      } else if (action === "hold") {
        await adminApi.operations.createFundHold(body, operationKey());
      } else {
        await adminApi.operations.transferAepsWallet(
          { ...body, sourceLoginId: form.sourceLoginId.trim() },
          operationKey(),
        );
      }
      setForm(emptyForm);
      setNotice({ ok: true, text: "Wallet operation completed successfully." });
      await loadHolds();
    } catch (error) {
      setNotice({
        ok: false,
        text: error instanceof Error ? error.message : "Wallet operation failed.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function release(hold: AdminFundHold) {
    const reason = window.prompt("Reason for releasing this hold")?.trim();
    if (!reason) return;
    const tpin = window.prompt("Enter Super Admin TPIN")?.trim();
    if (!tpin || !/^\d{4,6}$/.test(tpin)) {
      setNotice({ ok: false, text: "A valid 4 to 6 digit TPIN is required." });
      return;
    }
    setBusy(true);
    try {
      await adminApi.operations.releaseFundHold(hold.referenceId, { reason, tpin }, operationKey());
      setNotice({ ok: true, text: "Wallet hold released." });
      await loadHolds();
    } catch (error) {
      setNotice({
        ok: false,
        text: error instanceof Error ? error.message : "Hold could not be released.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mb-6 rounded-2xl border border-border bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-1 text-primary" size={21} />
        <div>
          <h2 className="text-xl font-black">Direct wallet controls</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            TPIN-authorized MAIN/AEPS credit, deduction, transfer and hold operations exposed by the
            backend.
          </p>
        </div>
      </div>
      {notice ? (
        <p
          className={`mt-4 rounded-xl p-3 text-sm font-semibold ${notice.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}
        >
          {notice.text}
        </p>
      ) : null}
      <form onSubmit={submit} className="mt-5 grid gap-3 lg:grid-cols-6">
        <select
          value={action}
          onChange={(event) => setAction(event.target.value as Action)}
          className={input}
        >
          <option value="credit-main">Credit MAIN</option>
          <option value="credit-aeps">Credit AEPS</option>
          <option value="deduct">Deduct MAIN</option>
          <option value="aeps-transfer">Transfer AEPS</option>
          <option value="hold">Hold MAIN</option>
        </select>
        {action === "aeps-transfer" ? (
          <input
            required
            maxLength={50}
            placeholder="Source Login ID"
            value={form.sourceLoginId}
            onChange={(event) => setForm({ ...form, sourceLoginId: event.target.value })}
            className={input}
          />
        ) : null}
        <input
          required
          maxLength={50}
          placeholder="Target Login ID"
          value={form.targetLoginId}
          onChange={(event) => setForm({ ...form, targetLoginId: event.target.value })}
          className={input}
        />
        <input
          required
          type="number"
          min="0.01"
          step="0.01"
          placeholder="Amount"
          value={form.amount}
          onChange={(event) => setForm({ ...form, amount: event.target.value })}
          className={input}
        />
        <input
          required
          maxLength={500}
          placeholder="Reason"
          value={form.reason}
          onChange={(event) => setForm({ ...form, reason: event.target.value })}
          className={input}
        />
        <input
          required
          type="password"
          inputMode="numeric"
          minLength={4}
          maxLength={6}
          placeholder="TPIN"
          value={form.tpin}
          onChange={(event) => setForm({ ...form, tpin: event.target.value.replace(/\D/g, "") })}
          className={input}
        />
        <button
          disabled={busy}
          className="rounded-xl bg-primary px-5 py-3 text-sm font-extrabold text-white disabled:opacity-50"
        >
          {busy ? "Processing…" : "Authorize operation"}
        </button>
      </form>
      <div className="mt-7 flex items-center justify-between">
        <h3 className="font-black">Wallet holds</h3>
        <button
          onClick={() => void loadHolds()}
          disabled={busy}
          aria-label="Refresh wallet holds"
          className="rounded-xl border border-border p-2"
        >
          <RefreshCw size={16} />
        </button>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase text-muted-foreground">
              <th className="p-3">Reference</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Reason</th>
              <th className="p-3">Status</th>
              <th className="p-3">Created</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {holds.map((hold) => (
              <tr key={hold.id} className="border-b border-border/60">
                <td className="p-3 font-mono text-xs">{hold.referenceId}</td>
                <td className="p-3 font-bold">₹{Number(hold.amount).toFixed(2)}</td>
                <td className="p-3">{hold.reason}</td>
                <td className="p-3 font-bold">{hold.status}</td>
                <td className="p-3">{new Date(hold.createdAt).toLocaleString("en-IN")}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      title="View hold details"
                      onClick={() => setSelectedHold(hold)}
                      className="rounded-lg border border-border p-2 text-primary"
                    >
                      <Eye size={14} />
                    </button>
                  {hold.status === "ACTIVE" ? (
                    <button
                      onClick={() => void release(hold)}
                      disabled={busy}
                      className="text-xs font-bold text-red-600"
                    >
                      Release
                    </button>
                  ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!holds.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No wallet holds found.</p>
        ) : null}
      </div>
      {selectedHold ? (
        <DetailModal title="Wallet hold detail" close={() => setSelectedHold(null)}>
          <DetailGrid values={[
            ["Reference", selectedHold.referenceId],
            ["Amount", `₹${Number(selectedHold.amount).toFixed(2)}`],
            ["Status", selectedHold.status],
            ["Reason", selectedHold.reason],
            ["Created", new Date(selectedHold.createdAt).toLocaleString("en-IN")],
            ["Resolution reason", selectedHold.resolutionReason],
            ["Released", selectedHold.releasedAt ? new Date(selectedHold.releasedAt).toLocaleString("en-IN") : null],
          ]} />
        </DetailModal>
      ) : null}
    </section>
  );
}

function DetailModal({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-secondary/60 p-4">
      <div role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-black">{title}</h2>
          <button type="button" onClick={close} className="rounded-lg border border-border p-2"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function DetailGrid({ values }: { values: Array<[string, unknown]> }) {
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      {values.map(([label, value]) => (
        <div key={label} className="rounded-xl border border-border bg-muted/40 p-4">
          <p className="text-[10px] font-extrabold uppercase text-muted-foreground">{label}</p>
          <p className="mt-1 break-all text-sm font-bold">{value === null || value === undefined || value === "" ? "—" : String(value)}</p>
        </div>
      ))}
    </div>
  );
}
