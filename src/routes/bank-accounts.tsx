import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { BadgeCheck, Building2, Landmark, Plus, RefreshCw, ShieldCheck, Star } from "lucide-react";
import { BusinessPage, ServiceNotice } from "@/components/business-page";
import { getSession } from "@/lib/auth-api";
import { complianceApi, complianceMessage, type BankAccount } from "@/lib/compliance-api";

export const Route = createFileRoute("/bank-accounts")({
  head: () => ({ meta: [{ title: "Bank Accounts — UMOBIPAY" }] }),
  component: BankAccountsPage,
});
const initial = {
  bankName: "",
  ifsc: "",
  branchName: "",
  accountHolderName: "",
  accountNumber: "",
  confirm: "",
  accountType: "SAVINGS" as "SAVINGS" | "CURRENT",
};
function BankAccountsPage() {
  const navigate = useNavigate(),
    [session, setSession] = useState<ReturnType<typeof getSession>>(null),
    [accounts, setAccounts] = useState<BankAccount[]>([]),
    [form, setForm] = useState(initial),
    [adding, setAdding] = useState(false),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  async function load(token: string) {
    setLoading(true);
    try {
      setAccounts(await complianceApi.banks(token));
    } catch (e) {
      setMessage({ ok: false, text: complianceMessage(e) });
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    const value = getSession();
    if (!value) {
      navigate({ to: "/login" });
      return;
    }
    if (!value.identity.passwordChangedAt || !value.identity.mpinChangedAt) {
      navigate({ to: "/dashboard" });
      return;
    }
    setSession(value);
    setForm((f) => ({ ...f, accountHolderName: value.identity.fullName }));
    void load(value.accessToken);
  }, [navigate]);
  if (!session)
    return (
      <div className="grid min-h-screen place-items-center">
        <RefreshCw className="animate-spin text-primary" />
      </div>
    );
  const activeSession = session;
  async function submit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (form.accountNumber !== form.confirm)
      return setMessage({ ok: false, text: "Account numbers do not match." });
    setBusy(true);
    try {
      await complianceApi.addBank(activeSession.accessToken, {
        bankName: form.bankName.trim(),
        ifsc: form.ifsc.toUpperCase(),
        branchName: form.branchName || undefined,
        accountHolderName: form.accountHolderName.trim(),
        accountNumber: form.accountNumber,
        accountType: form.accountType,
        purposes: ["PAYOUT", "DMT"],
      });
      setForm({ ...initial, accountHolderName: activeSession.identity.fullName });
      setAdding(false);
      setMessage({ ok: true, text: "Bank account verified and added successfully." });
      await load(activeSession.accessToken);
    } catch (err) {
      setMessage({ ok: false, text: complianceMessage(err) });
    } finally {
      setBusy(false);
    }
  }
  const verified = accounts.some(
    (a) =>
      a.status === "ACTIVE" &&
      a.verificationStatus === "VERIFIED" &&
      a.ownershipStatus === "VERIFIED",
  );
  return (
    <BusinessPage
      identity={session.identity}
      active="bank"
      eyebrow="Settlement & payouts"
      title="Bank accounts"
      description="Manage verified settlement accounts independently from KYC and AEPS services."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-7">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-secondary">Your bank accounts</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Account details are encrypted; only the last four digits are displayed.
              </p>
            </div>
            <button
              onClick={() => setAdding(!adding)}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white"
            >
              <Plus size={16} /> Add account
            </button>
          </div>
          {message && (
            <div className="mt-5">
              <ServiceNotice ok={message.ok}>{message.text}</ServiceNotice>
            </div>
          )}
          {loading ? (
            <div className="grid h-40 place-items-center">
              <RefreshCw className="animate-spin text-primary" />
            </div>
          ) : accounts.length ? (
            <div className="mt-6 space-y-3">
              {accounts.map((a) => (
                <article key={a.id} className="rounded-2xl border border-border bg-background p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <span className="grid h-12 w-12 place-items-center rounded-xl bg-mint text-secondary">
                      <Landmark />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-secondary">{a.bankName}</h3>
                        {a.isDefault && (
                          <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">
                            PRIMARY
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        •••• {a.accountNumberLast4} · {a.accountType} · {a.ifsc}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{a.accountHolderName}</p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-xs font-extrabold ${a.verificationStatus === "VERIFIED" ? "text-emerald-600" : "text-amber-600"}`}
                      >
                        {a.verificationStatus}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Ownership {a.ownershipStatus}
                      </p>
                      {!a.isDefault && a.status === "ACTIVE" && (
                        <button
                          onClick={async () => {
                            await complianceApi.setPrimary(session.accessToken, a.id);
                            await load(session.accessToken);
                          }}
                          className="mt-2 text-xs font-bold text-primary"
                        >
                          Set as primary
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-border p-12 text-center">
              <Building2 className="mx-auto text-muted-foreground" />
              <p className="mt-3 font-bold text-secondary">No bank account connected</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add an account to enable settlement and AEPS onboarding.
              </p>
            </div>
          )}
          {adding && (
            <form
              onSubmit={submit}
              className="mt-6 grid gap-4 rounded-2xl border border-border bg-mint/40 p-5 sm:grid-cols-2"
            >
              {[
                ["Bank name", "bankName"],
                ["IFSC code", "ifsc"],
                ["Branch (optional)", "branchName"],
                ["Account holder name", "accountHolderName"],
                ["Account number", "accountNumber"],
                ["Confirm account number", "confirm"],
              ].map(([label, key]) => (
                <label key={key} className="text-xs font-bold uppercase text-muted-foreground">
                  {label}
                  <input
                    required={key !== "branchName"}
                    value={form[key as keyof typeof form]}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        [key]:
                          key === "ifsc"
                            ? e.target.value.toUpperCase().slice(0, 11)
                            : key.includes("accountNumber") || key === "confirm"
                              ? e.target.value.replace(/\D/g, "").slice(0, 18)
                              : e.target.value,
                      })
                    }
                    className="mt-1.5 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm font-normal normal-case outline-none focus:border-primary"
                  />
                </label>
              ))}
              <label className="text-xs font-bold uppercase text-muted-foreground">
                Account type
                <select
                  value={form.accountType}
                  onChange={(e) =>
                    setForm({ ...form, accountType: e.target.value as "SAVINGS" | "CURRENT" })
                  }
                  className="mt-1.5 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm"
                >
                  <option value="SAVINGS">Savings</option>
                  <option value="CURRENT">Current</option>
                </select>
              </label>
              <button
                disabled={busy}
                className="self-end rounded-xl bg-secondary py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {busy ? "Verifying account…" : "Verify and save"}
              </button>
            </form>
          )}
        </section>
        <aside className="space-y-4">
          <div className="rounded-2xl bg-secondary p-6 text-white">
            <ShieldCheck />
            <h2 className="mt-4 text-lg font-extrabold">Bank verification</h2>
            <p className="mt-2 text-sm text-white/65">
              The Bank service validates account status, IFSC and ownership before saving.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-extrabold uppercase text-muted-foreground">Next step</p>
            <h3 className="mt-2 font-extrabold text-secondary">Complete business KYC</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              KYC is a separate compliance service and can be started after bank verification.
            </p>
            <Link
              to="/kyc"
              className={`mt-4 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold ${verified ? "bg-primary text-white" : "pointer-events-none bg-muted text-muted-foreground"}`}
            >
              <BadgeCheck size={16} /> Continue to KYC
            </Link>
          </div>
        </aside>
      </div>
    </BusinessPage>
  );
}
