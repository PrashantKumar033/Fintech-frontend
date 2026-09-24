import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Building2, CircleAlert, LoaderCircle, RefreshCw } from "lucide-react";
import { BusinessPage } from "@/components/business-page";
import { AdminLayout } from "@/components/admin/admin-layout";
import { getSession } from "@/lib/auth-api";
import {
  newTransferIdempotencyKey,
  operationsApi,
  operationsMessage,
  type FundReceivingBank,
  type FundRequest,
} from "@/lib/operations-api";
import { credentialsPending, resolveWorkspaceRole, signedInHome } from "@/lib/role-hierarchy";

export const Route = createFileRoute("/retailer/wallet/requests")({ component: FundRequestsPage });

const initialForm = {
  amount: "",
  receivingBankAccountId: "",
  paymentMode: "IMPS",
  paymentReference: "",
  paymentDate: new Date().toISOString().slice(0, 10),
  remark: "",
};

export function FundRequestsPage() {
  const navigate = useNavigate();
  const session = getSession();
  const [banks, setBanks] = useState<FundReceivingBank[]>([]);
  const [requests, setRequests] = useState<FundRequest[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editingReference, setEditingReference] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const requestKey = useRef<string | null>(null);

  async function load() {
    if (!session) return;
    setLoading(true);
    try {
      const [bankData, requestData] = await Promise.all([
        operationsApi.receivingBanks(session.accessToken),
        operationsApi.fundRequests(session.accessToken),
      ]);
      setBanks(bankData);
      setRequests(requestData);
      setForm((current) => ({
        ...current,
        receivingBankAccountId:
          current.receivingBankAccountId ||
          bankData.find((bank) => bank.isDefault)?.id ||
          bankData[0]?.id ||
          "",
      }));
    } catch (error) {
      setNotice({ ok: false, text: operationsMessage(error) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!session) return void navigate({ to: "/login" });
    const role = resolveWorkspaceRole(session.identity.role);
    if (
      !["RETAILER", "DISTRIBUTOR", "MASTER_DISTRIBUTOR"].includes(role || "") ||
      credentialsPending(session.identity)
    ) {
      window.location.replace(signedInHome(session));
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, session?.identity.id]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!session || busy) return;
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount < 100)
      return setNotice({ ok: false, text: "Fund request amount must be at least ₹100." });
    if (!form.receivingBankAccountId)
      return setNotice({ ok: false, text: "Select the company bank account used for deposit." });
    if (form.paymentMode !== "CASH" && !form.paymentReference.trim())
      return setNotice({
        ok: false,
        text: "UTR/payment reference is required for this payment mode.",
      });
    setBusy(true);
    setNotice(null);
    requestKey.current ||= newTransferIdempotencyKey();
    try {
      const payload = {
        amount,
        receivingBankAccountId: form.receivingBankAccountId,
        paymentMode: form.paymentMode,
        paymentReference: form.paymentReference.trim() || undefined,
        paymentDate: new Date(`${form.paymentDate}T00:00:00.000Z`).toISOString(),
        remark: form.remark.trim() || undefined,
      };
      if (editingReference) {
        await operationsApi.resubmitFundRequest(session.accessToken, editingReference, payload);
      } else {
        await operationsApi.createFundRequest(session.accessToken, payload, requestKey.current);
      }
      requestKey.current = null;
      setEditingReference(null);
      setForm({ ...initialForm, receivingBankAccountId: form.receivingBankAccountId });
      setNotice({
        ok: true,
        text: editingReference
          ? "Corrected fund request resubmitted for Super Admin review."
          : "Fund request submitted for Super Admin review.",
      });
      await load();
    } catch (error) {
      setNotice({ ok: false, text: operationsMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  if (!session)
    return (
      <div className="grid min-h-screen place-items-center">
        <LoaderCircle className="animate-spin" />
      </div>
    );
  const selectedBank = banks.find((bank) => bank.id === form.receivingBankAccountId);

  const content = (
    <>
      {notice ? (
        <p
          className={`mb-5 rounded-xl p-4 text-sm font-semibold ${notice.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}
        >
          {notice.text}
        </p>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <form
          onSubmit={submit}
          className="rounded-2xl border border-border bg-card p-6 shadow-soft"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black text-secondary">
              {editingReference ? "Correct fund request" : "Payment details"}
            </h2>
            {editingReference ? (
              <button
                type="button"
                className="text-xs font-bold text-primary"
                onClick={() => {
                  setEditingReference(null);
                  setForm({
                    ...initialForm,
                    receivingBankAccountId:
                      banks.find((bank) => bank.isDefault)?.id || banks[0]?.id || "",
                  });
                }}
              >
                Cancel editing
              </button>
            ) : null}
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Amount (minimum ₹100)">
              <input
                required
                type="number"
                min="100"
                step="0.01"
                value={form.amount}
                onChange={(e) => {
                  requestKey.current = null;
                  setForm({ ...form, amount: e.target.value });
                }}
                className="input"
              />
            </Field>
            <Field label="Company receiving bank">
              <select
                required
                value={form.receivingBankAccountId}
                onChange={(e) => {
                  requestKey.current = null;
                  setForm({ ...form, receivingBankAccountId: e.target.value });
                }}
                className="input"
              >
                <option value="">Select account</option>
                {banks.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.displayName || bank.bankName} · {bank.maskedAccountNumber}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Payment mode">
              <select
                required
                value={form.paymentMode}
                onChange={(e) => {
                  requestKey.current = null;
                  setForm({ ...form, paymentMode: e.target.value });
                }}
                className="input"
              >
                {["IMPS", "NEFT", "RTGS", "UPI", "BANK_TRANSFER", "CASH", "CHEQUE"].map((mode) => (
                  <option key={mode}>{mode.replaceAll("_", " ")}</option>
                ))}
              </select>
            </Field>
            <Field label="Payment date">
              <input
                required
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                value={form.paymentDate}
                onChange={(e) => {
                  requestKey.current = null;
                  setForm({ ...form, paymentDate: e.target.value });
                }}
                className="input"
              />
            </Field>
            <Field
              label={
                form.paymentMode === "CASH" ? "Reference (optional)" : "UTR / payment reference"
              }
            >
              <input
                required={form.paymentMode !== "CASH"}
                maxLength={150}
                value={form.paymentReference}
                onChange={(e) => {
                  requestKey.current = null;
                  setForm({ ...form, paymentReference: e.target.value });
                }}
                className="input"
              />
            </Field>
            <Field label="Remark (optional)">
              <input
                maxLength={500}
                value={form.remark}
                onChange={(e) => setForm({ ...form, remark: e.target.value })}
                className="input"
              />
            </Field>
          </div>
          <button
            disabled={busy || loading || !banks.length}
            className="mt-5 w-full rounded-xl bg-primary px-5 py-3 font-extrabold text-white disabled:opacity-50"
          >
            {busy
              ? "Submitting…"
              : editingReference
                ? "Resubmit corrected request"
                : "Submit fund request"}
          </button>
        </form>
        <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="flex items-center gap-2 text-xl font-black text-secondary">
            <Building2 size={20} /> Deposit account
          </h2>
          {selectedBank ? (
            <dl className="mt-5 space-y-3 text-sm">
              <Row label="Bank" value={selectedBank.bankName} />
              <Row label="Account holder" value={selectedBank.accountHolderName} />
              <Row label="Account" value={selectedBank.maskedAccountNumber} />
              <Row label="IFSC" value={selectedBank.ifsc} />
              <Row label="UPI" value={selectedBank.upiId || "—"} />
            </dl>
          ) : (
            <p className="mt-5 text-sm text-muted-foreground">
              No active company receiving bank is configured.
            </p>
          )}
          <p className="mt-5 flex gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
            <CircleAlert size={16} className="shrink-0" />
            Deposit first and enter the exact bank reference. Wallet credit happens only after Super
            Admin approval.
          </p>
        </section>
      </div>
      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-secondary">My fund requests</h2>
          <button onClick={() => void load()} disabled={loading}>
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                <th className="p-3">Reference</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Mode</th>
                <th className="p-3">Status</th>
                <th className="p-3">Date</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((item) => (
                <tr key={item.id} className="border-b border-border/60">
                  <td className="p-3 font-mono text-xs">{item.referenceId}</td>
                  <td className="p-3 font-bold">₹{Number(item.amount).toFixed(2)}</td>
                  <td className="p-3">{item.paymentMode}</td>
                  <td className="p-3 font-bold">{item.status}</td>
                  <td className="p-3">{new Date(item.createdAt).toLocaleString("en-IN")}</td>
                  <td className="p-3">
                    {item.status === "REINITIATE" ? (
                      <div className="flex items-center gap-3">
                        <button
                          className="text-xs font-bold text-primary"
                          onClick={() => {
                            setEditingReference(item.referenceId);
                            setForm({
                              amount: item.amount,
                              receivingBankAccountId: item.receivingBankAccountId,
                              paymentMode: item.paymentMode,
                              paymentReference: item.paymentReference || "",
                              paymentDate: new Date(item.paymentDate).toISOString().slice(0, 10),
                              remark: item.remark || "",
                            });
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        >
                          Correct &amp; resubmit
                        </button>
                        <button
                          className="text-xs font-bold text-red-600"
                          onClick={async () => {
                            if (!window.confirm("Cancel this fund request?")) return;
                            await operationsApi.cancelFundRequest(
                              session.accessToken,
                              item.referenceId,
                            );
                            await load();
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : item.status === "PENDING" ? (
                      <button
                        className="text-xs font-bold text-red-600"
                        onClick={async () => {
                          if (!window.confirm("Cancel this fund request?")) return;
                          await operationsApi.cancelFundRequest(
                            session.accessToken,
                            item.referenceId,
                          );
                          await load();
                        }}
                      >
                        Cancel
                      </button>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !requests.length ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No fund requests yet.</p>
          ) : null}
        </div>
      </section>
    </>
  );

  const description =
    "Deposit into an authorised company account, then submit the payment details for approval.";
  return resolveWorkspaceRole(session.identity.role) !== "RETAILER" ? (
    <AdminLayout
      active="settlements"
      eyebrow="Wallet funding"
      title="Add money request"
      description={description}
    >
      {content}
    </AdminLayout>
  ) : (
    <BusinessPage
      identity={session.identity}
      active="wallet"
      eyebrow="Wallet funding"
      title="Add money request"
      description={description}
    >
      {content}
    </BusinessPage>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-xs font-bold uppercase text-muted-foreground">
      {label}
      <div className="mt-1.5 [&_.input]:w-full [&_.input]:rounded-xl [&_.input]:border [&_.input]:border-border [&_.input]:bg-background [&_.input]:px-4 [&_.input]:py-3 [&_.input]:text-sm [&_.input]:font-normal [&_.input]:normal-case [&_.input]:outline-none">
        {children}
      </div>
    </label>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border pb-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-bold text-secondary">{value}</dd>
    </div>
  );
}
