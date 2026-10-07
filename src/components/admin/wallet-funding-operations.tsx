import { useEffect, useState, type FormEvent } from "react";
import { Eye, Landmark, LoaderCircle, RefreshCw, X } from "lucide-react";
import {
  adminApi,
  getAdminActor,
  type AdminFundReceivingBank,
  type AdminFundRequest,
} from "@/lib/admin-api";

const field =
  "w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none focus:border-primary";
const emptyBank = {
  displayName: "",
  bankName: "",
  ifsc: "",
  branchName: "",
  accountHolderName: "",
  accountNumber: "",
  accountType: "CURRENT",
  upiId: "",
};

export function WalletFundingOperations() {
  const isSuperAdmin = getAdminActor()?.kind === "SUPER_ADMIN";
  const [view, setView] = useState<"requests" | "banks">("requests");
  const [banks, setBanks] = useState<AdminFundReceivingBank[]>([]);
  const [requests, setRequests] = useState<AdminFundRequest[]>([]);
  const [status, setStatus] = useState("");
  const [bankForm, setBankForm] = useState(emptyBank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<AdminFundRequest | null>(null);

  async function load() {
    if (!isSuperAdmin) return;
    setBusy(true);
    setError("");
    try {
      const [bankData, requestData] = await Promise.all([
        adminApi.operations.fundReceivingBanks(),
        adminApi.operations.fundRequests(status),
      ]);
      setBanks(bankData);
      setRequests(requestData);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Wallet funding data could not be loaded.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (isSuperAdmin) void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [status, isSuperAdmin]);

  async function createBank(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await adminApi.operations.createFundReceivingBank({
        ...bankForm,
        ifsc: bankForm.ifsc.toUpperCase(),
        isDefault: banks.length === 0,
      });
      setBankForm(emptyBank);
      await load();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Receiving bank could not be created.");
    } finally {
      setBusy(false);
    }
  }

  async function review(item: AdminFundRequest, action: "approve" | "reject" | "reinitiate") {
    const reason =
      action === "approve"
        ? window.prompt("Optional approval remark") || ""
        : window.prompt(action === "reject" ? "Rejection reason" : "Correction required") || "";
    if (action !== "approve" && !reason.trim()) return;
    let tpin = "";
    if (action === "approve") {
      tpin = window.prompt("Enter your 4-6 digit financial TPIN") || "";
      if (!/^\d{4,6}$/.test(tpin))
        return setError("A valid financial TPIN is required for approval.");
    }
    setBusy(true);
    setError("");
    try {
      if (action === "approve")
        await adminApi.operations.approveFundRequest(item.referenceId, tpin, reason);
      else if (action === "reject")
        await adminApi.operations.rejectFundRequest(item.referenceId, reason);
      else await adminApi.operations.reinitiateFundRequest(item.referenceId, reason);
      await load();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Fund request review failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!isSuperAdmin) return null;
  return (
    <section className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-primary">Wallet funding</p>
          <h2 className="text-xl font-black text-secondary">Fund requests & receiving banks</h2>
        </div>
        <button
          onClick={() => void load()}
          disabled={busy}
          className="rounded-xl border border-border p-2.5"
        >
          <RefreshCw size={17} className={busy ? "animate-spin" : ""} />
        </button>
      </div>
      <div className="mt-5 flex gap-2">
        <button
          onClick={() => setView("requests")}
          className={`rounded-xl px-4 py-2 text-sm font-bold ${view === "requests" ? "bg-primary text-white" : "bg-muted"}`}
        >
          Fund requests
        </button>
        <button
          onClick={() => setView("banks")}
          className={`rounded-xl px-4 py-2 text-sm font-bold ${view === "banks" ? "bg-primary text-white" : "bg-muted"}`}
        >
          Receiving banks
        </button>
      </div>
      {error ? (
        <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>
      ) : null}
      {view === "requests" ? (
        <div className="mt-5">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={`${field} max-w-xs`}
          >
            <option value="">All statuses</option>
            {["PENDING", "APPROVED", "REJECTED", "REINITIATE", "CANCELLED"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                  <th className="p-3">Reference</th>
                  <th className="p-3">Retailer</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Payment</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((item) => (
                  <tr key={item.id} className="border-b border-border/60">
                    <td className="p-3 font-mono text-xs">{item.referenceId}</td>
                    <td className="p-3">
                      <p className="font-bold">{item.userLoginId || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{item.userRole || "Retailer"}</p>
                    </td>
                    <td className="p-3 font-bold">₹{Number(item.amount).toFixed(2)}</td>
                    <td className="p-3">
                      {item.paymentMode}
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {item.paymentReference || "No reference"}
                      </span>
                    </td>
                    <td className="p-3 font-bold">{item.status}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          title="View request details"
                          onClick={() => setSelectedRequest(item)}
                          className="rounded-lg border border-border p-2 text-primary"
                        >
                          <Eye size={14} />
                        </button>
                      {item.status === "PENDING" ? (
                        <>
                          <button
                            onClick={() => void review(item, "approve")}
                            className="font-bold text-emerald-700"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => void review(item, "reinitiate")}
                            className="font-bold text-amber-700"
                          >
                            Correct
                          </button>
                          <button
                            onClick={() => void review(item, "reject")}
                            className="font-bold text-red-600"
                          >
                            Reject
                          </button>
                        </>
                      ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!busy && !requests.length ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No fund requests found.
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="mt-5 grid gap-6 xl:grid-cols-[1fr_420px]">
          <div className="space-y-3">
            {banks.map((bank) => (
              <article
                key={bank.id}
                className="flex flex-wrap items-center gap-4 rounded-xl border border-border p-4"
              >
                <Landmark className="text-primary" />
                <div className="flex-1">
                  <strong>{bank.displayName || bank.bankName}</strong>
                  <p className="text-xs text-muted-foreground">
                    {bank.accountHolderName} · {bank.maskedAccountNumber} · {bank.ifsc}
                  </p>
                </div>
                <span className="text-xs font-bold">
                  {bank.status}
                  {bank.isDefault ? " · DEFAULT" : ""}
                </span>
                {bank.status === "ACTIVE" && !bank.isDefault ? (
                  <>
                    <button
                      onClick={async () => {
                        await adminApi.operations.setDefaultFundReceivingBank(bank.id);
                        await load();
                      }}
                      className="text-xs font-bold text-primary"
                    >
                      Set default
                    </button>
                    <button
                      onClick={async () => {
                        if (!window.confirm("Deactivate this receiving bank?")) return;
                        await adminApi.operations.deactivateFundReceivingBank(bank.id);
                        await load();
                      }}
                      className="text-xs font-bold text-red-600"
                    >
                      Deactivate
                    </button>
                  </>
                ) : null}
              </article>
            ))}
          </div>
          <form onSubmit={createBank} className="rounded-xl bg-mint/50 p-5">
            <h3 className="font-black text-secondary">Add receiving bank</h3>
            <div className="mt-4 space-y-3">
              {(
                [
                  ["Display name", "displayName", false],
                  ["Bank name", "bankName", true],
                  ["IFSC", "ifsc", true],
                  ["Branch", "branchName", false],
                  ["Account holder", "accountHolderName", true],
                  ["Account number", "accountNumber", true],
                  ["UPI ID", "upiId", false],
                ] as const
              ).map(([label, key, required]) => (
                <label
                  key={key}
                  className="block text-xs font-bold uppercase text-muted-foreground"
                >
                  {label}
                  <input
                    required={required}
                    value={bankForm[key]}
                    onChange={(e) =>
                      setBankForm({
                        ...bankForm,
                        [key]:
                          key === "ifsc"
                            ? e.target.value.toUpperCase().slice(0, 11)
                            : key === "accountNumber"
                              ? e.target.value.replace(/\D/g, "").slice(0, 18)
                              : e.target.value,
                      })
                    }
                    className={`${field} mt-1`}
                  />
                </label>
              ))}
              <label className="block text-xs font-bold uppercase text-muted-foreground">
                Account type
                <select
                  value={bankForm.accountType}
                  onChange={(e) => setBankForm({ ...bankForm, accountType: e.target.value })}
                  className={`${field} mt-1`}
                >
                  <option>CURRENT</option>
                  <option>SAVINGS</option>
                  <option>SALARY</option>
                </select>
              </label>
            </div>
            <button
              disabled={busy}
              className="mt-4 w-full rounded-xl bg-secondary py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy ? (
                <LoaderCircle className="mx-auto animate-spin" size={18} />
              ) : (
                "Add receiving bank"
              )}
            </button>
          </form>
        </div>
      )}
      {selectedRequest ? (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-secondary/60 p-4">
          <div role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.16em] text-primary">Wallet funding</p>
                <h2 className="mt-1 text-xl font-black">Fund request detail</h2>
              </div>
              <button type="button" onClick={() => setSelectedRequest(null)} className="rounded-lg border border-border p-2"><X size={18} /></button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {([
                ["Reference", selectedRequest.referenceId],
                ["Retailer role ID", selectedRequest.userLoginId || "Unknown"],
                ["Retailer name", selectedRequest.userDisplayName],
                ["Role", selectedRequest.userRole || "RETAILER"],
                ["Amount", `₹${Number(selectedRequest.amount).toFixed(2)}`],
                ["Payment mode", selectedRequest.paymentMode],
                ["Payment reference", selectedRequest.paymentReference],
                ["Status", selectedRequest.status],
                ["Remark", selectedRequest.remark],
                ["Admin remark", selectedRequest.adminRemark],
                ["Created", new Date(selectedRequest.createdAt).toLocaleString("en-IN")],
              ] as Array<[string, unknown]>).map(([label, value]) => (
                <div key={label} className="rounded-xl border border-border bg-muted/40 p-4">
                  <p className="text-[10px] font-extrabold uppercase text-muted-foreground">{label}</p>
                  <p className="mt-1 break-all text-sm font-bold">{value === null || value === undefined || value === "" ? "—" : String(value)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
