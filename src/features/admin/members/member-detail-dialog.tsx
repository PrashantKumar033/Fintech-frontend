import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Building2,
  Landmark,
  Loader2,
  ShieldCheck,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { useEffectiveAccess } from "@/hooks/use-effective-access";
import {
  adminApi,
  getAdminActor,
  type AdminBankAccount,
  type AdminMemberDetail,
  type AdminWalletLedgerPage,
} from "@/lib/admin-api";
import { UI_PERMISSION } from "@/lib/ui-permissions";

const control =
  "rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-primary";

export function MemberDetailDialog({
  detail,
  close,
}: {
  detail: AdminMemberDetail;
  close: () => void;
}) {
  const { can } = useEffectiveAccess();
  const privileged = getAdminActor()?.kind === "SUPER_ADMIN";
  const canChangeAeps =
    privileged || can(UI_PERMISSION.AEPS_MERCHANT_STATUS_UPDATE, ["SUPER_ADMIN", "ADMIN"]);
  const canViewLedger =
    privileged || can(UI_PERMISSION.WALLET_LEDGER_VIEW, ["SUPER_ADMIN", "ADMIN"]);
  const [member, setMember] = useState(detail);
  const [ledger, setLedger] = useState<AdminWalletLedgerPage | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [aepsStatus, setAepsStatus] = useState("SUSPENDED");
  const [reason, setReason] = useState("");

  const identity = member.identity;
  const kyc = member.kyc;
  const aeps = member.aeps;
  const canActivateAeps = Boolean(
    aeps?.providerMerchantId && aeps.providerRegistrationCompleted && aeps.onboardingCompleted,
  );
  const bankAccounts = member.bankAccounts ?? [];
  const balances = member.wallets?.wallets;

  async function refreshMember() {
    setMember(await adminApi.operations.member(identity.id));
  }

  async function changeAepsStatus() {
    if (!canChangeAeps) return;
    if (aepsStatus === "ACTIVE" && !canActivateAeps) {
      setError(
        "Complete provider registration, OTP and e-KYC before activating AEPS for this member.",
      );
      return;
    }
    if (aepsStatus !== "ACTIVE" && !reason.trim()) {
      setError("Enter a reason before suspending or blocking AEPS access.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await adminApi.operations.updateAepsMerchantStatus(identity.id, aepsStatus, reason);
      await refreshMember();
      setReason("");
      setNotice(`AEPS merchant status changed to ${aepsStatus}.`);
    } catch (value) {
      setError(messageOf(value));
    } finally {
      setBusy(false);
    }
  }

  async function loadLedger() {
    if (!canViewLedger) return;
    setLedgerLoading(true);
    setError("");
    try {
      setLedger(await adminApi.operations.walletLedger(identity.id, "page=1&limit=20"));
    } catch (value) {
      setError(messageOf(value));
    } finally {
      setLedgerLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-secondary/60 p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-primary">Consolidated member</p>
            <h2 className="text-2xl font-black">{identity.fullName}</h2>
            <p className="text-sm text-muted-foreground">
              {identity.loginId} · {identity.role?.name?.replaceAll("_", " ")}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="cursor-pointer rounded-xl border border-border p-3"
            aria-label="Close member details"
          >
            <X />
          </button>
        </div>

        {member.partialErrors?.length ? (
          <Message tone="warning">
            Some live sections could not be loaded: {member.partialErrors.join("; ")}.
          </Message>
        ) : null}
        {error ? <Message tone="error">{error}</Message> : null}
        {notice ? <Message tone="success">{notice}</Message> : null}

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <Section icon={UserRound} title="Identity & contact">
            <Details
              rows={[
                ["Account status", <Status key="account-status" value={identity.status} />],
                ["Login ID", identity.loginId],
                ["Username", identity.username],
                ["Email", identity.email],
                ["Phone", identity.phoneNumber],
                ["Onboarding", formatLabel(identity.onboardingStatus)],
                ["Last login", formatDate(identity.lastLoginAt)],
              ]}
            />
          </Section>

          <Section icon={Building2} title="Business & location">
            <Details
              rows={[
                ["Shop", identity.shopName],
                ["City", identity.shopCity || identity.city],
                ["State", identity.shopState || identity.state],
                ["PIN code", identity.pincode],
                ["Member since", formatDate(identity.createdAt)],
              ]}
            />
          </Section>

          <Section icon={BadgeCheck} title="KYC">
            <Details
              rows={[
                ["Status", <Status key="kyc-status" value={text(kyc?.status, "NOT STARTED")} />],
                ["Submitted", formatDate(kyc?.submittedAt)],
                ["Remarks", text(kyc?.remarks)],
              ]}
            />
          </Section>

          <Section icon={ShieldCheck} title="AEPS merchant">
            <Details
              rows={[
                ["Provider", text(aeps?.provider, "VIMOPAY")],
                ["Merchant ID", text(aeps?.providerMerchantId)],
                ["Status", <Status key="aeps-status" value={text(aeps?.status, "NOT STARTED")} />],
                ["Onboarding step", formatLabel(aeps?.onboardingStep)],
                ["Registration", yesNo(aeps?.providerRegistrationCompleted)],
                ["Onboarding complete", yesNo(aeps?.onboardingCompleted)],
                ["Service active", yesNo(aeps?.serviceActivated)],
                ["Last 2FA", formatDate(aeps?.lastTwoFactorAuthAt)],
                ["Reason", text(aeps?.statusReason)],
              ]}
            />
            {canChangeAeps && text(aeps?.status, "NOT_STARTED") !== "NOT_STARTED" ? (
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-xs font-black uppercase text-muted-foreground">
                  Change AEPS access
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-[120px_1fr_auto]">
                  <select
                    value={aepsStatus}
                    onChange={(event) => setAepsStatus(event.target.value)}
                    className={control}
                  >
                    <option value="ACTIVE" disabled={!canActivateAeps}>
                      ACTIVE{canActivateAeps ? "" : " (onboarding required)"}
                    </option>
                    <option value="SUSPENDED">SUSPENDED</option>
                    <option value="BLOCKED">BLOCKED</option>
                  </select>
                  <input
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder={
                      aepsStatus === "ACTIVE" ? "Reason (optional)" : "Reason (required)"
                    }
                    className={control}
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void changeAepsStatus()}
                    className="cursor-pointer rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="animate-spin" size={18} /> : "Update"}
                  </button>
                </div>
                {!canActivateAeps ? (
                  <p className="mt-2 text-xs font-semibold text-amber-700">
                    Activation is unavailable until VimoPay returns a Merchant ID and the member
                    completes OTP and e-KYC onboarding.
                  </p>
                ) : null}
              </div>
            ) : null}
          </Section>
        </div>

        <Section icon={Landmark} title={`Bank accounts (${bankAccounts.length})`} className="mt-4">
          {bankAccounts.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {bankAccounts.map((bank) => (
                <BankCard key={bank.id} bank={bank} />
              ))}
            </div>
          ) : (
            <Empty>No bank accounts are available for this member.</Empty>
          )}
        </Section>

        <Section icon={WalletCards} title="Wallets & ledger" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Balance label="Main wallet" value={balances?.main} />
            <Balance label="AEPS wallet" value={balances?.aeps} />
            <Balance label="Profit wallet" value={balances?.profit} />
          </div>
          {canViewLedger ? (
            <button
              type="button"
              disabled={ledgerLoading}
              onClick={() => void loadLedger()}
              className="mt-4 flex cursor-pointer items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-bold disabled:cursor-not-allowed"
            >
              {ledgerLoading && <Loader2 className="animate-spin" size={16} />}
              {ledger ? "Refresh ledger" : "Load wallet ledger"}
            </button>
          ) : null}
          {ledger ? <LedgerTable ledger={ledger} /> : null}
        </Section>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
  className = "",
}: {
  icon: typeof ShieldCheck;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-border p-4 ${className}`}>
      <h3 className="mb-4 flex items-center gap-2 font-black">
        <Icon size={18} className="text-primary" /> {title}
      </h3>
      {children}
    </section>
  );
}

function Details({ rows }: { rows: Array<[string, React.ReactNode]> }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-lg bg-muted/60 p-3">
          <dt className="text-[10px] font-black uppercase text-muted-foreground">{label}</dt>
          <dd className="mt-1 break-words text-sm font-semibold">{value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

function BankCard({ bank }: { bank: AdminBankAccount }) {
  return (
    <article className="rounded-xl bg-muted/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black">{bank.bankName}</p>
          <p className="text-xs text-muted-foreground">••••{bank.accountNumberLast4}</p>
        </div>
        <Status value={bank.verificationStatus} />
      </div>
      <Details
        rows={[
          ["Holder", bank.accountHolderName],
          ["IFSC", bank.ifsc],
          ["Type", bank.accountType],
          ["Ownership", formatLabel(bank.ownershipStatus)],
          ["Account status", formatLabel(bank.status)],
          ["Default", bank.isDefault ? "Yes" : "No"],
        ]}
      />
    </article>
  );
}

function Balance({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-xl bg-muted p-4">
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-black">{value == null ? "Unavailable" : money(value)}</p>
    </div>
  );
}

function LedgerTable({ ledger }: { ledger: AdminWalletLedgerPage }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-muted/70 text-xs uppercase text-muted-foreground">
          <tr>
            {["Reference", "Wallet", "Service", "Type", "Amount", "Balance", "Status", "Date"].map(
              (label) => (
                <th key={label} className="px-3 py-2">
                  {label}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {ledger.data.map((entry) => (
            <tr key={entry.id}>
              <td className="px-3 py-2 font-mono text-xs">{entry.referenceId}</td>
              <td className="px-3 py-2">{entry.walletType}</td>
              <td className="px-3 py-2">{formatLabel(entry.serviceType)}</td>
              <td className="px-3 py-2">{entry.type}</td>
              <td className="px-3 py-2 font-bold">{money(entry.amount)}</td>
              <td className="px-3 py-2">{money(entry.closingBalance)}</td>
              <td className="px-3 py-2">
                <Status value={entry.status} />
              </td>
              <td className="px-3 py-2 text-xs">{formatDate(entry.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!ledger.data.length ? <Empty>No wallet ledger entries found.</Empty> : null}
      <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
        Showing {ledger.data.length} of {ledger.total} entries
      </p>
    </div>
  );
}

function Status({ value }: { value: string }) {
  const normalized = value.toUpperCase().replaceAll(" ", "_");
  const good = ["ACTIVE", "APPROVED", "VERIFIED", "SUCCESS", "ENABLED"].includes(normalized);
  const bad = ["BLOCKED", "SUSPENDED", "REJECTED", "FAILED", "DISABLED"].includes(normalized);
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black ${
        good
          ? "bg-emerald-50 text-emerald-700"
          : bad
            ? "bg-red-50 text-red-700"
            : "bg-amber-50 text-amber-700"
      }`}
    >
      {formatLabel(value)}
    </span>
  );
}

function Message({
  tone,
  children,
}: {
  tone: "warning" | "error" | "success";
  children: React.ReactNode;
}) {
  const style = {
    warning: "bg-amber-50 text-amber-800",
    error: "bg-red-50 text-red-700",
    success: "bg-emerald-50 text-emerald-700",
  }[tone];
  return <p className={`mt-4 rounded-xl p-3 text-sm font-semibold ${style}`}>{children}</p>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>;
}

function text(value: unknown, fallback = "—") {
  return value == null || value === "" ? fallback : String(value);
}

function yesNo(value: unknown) {
  return value === true ? "Yes" : value === false ? "No" : "—";
}

function formatLabel(value: unknown) {
  return text(value).replaceAll("_", " ");
}

function formatDate(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("en-IN");
}

function money(value: string | number) {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
    : "—";
}

function messageOf(value: unknown) {
  return value instanceof Error ? value.message : "The request could not be completed.";
}
