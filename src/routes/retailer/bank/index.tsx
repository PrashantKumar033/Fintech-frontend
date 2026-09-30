import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  BadgeCheck,
  Building2,
  Edit3,
  FileText,
  Landmark,
  MapPin,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { ServiceNotice } from "@/components/business-page";
import { RoleAwareAccountPage } from "@/components/role-aware-account-page";
import { getSession } from "@/lib/auth-api";
import {
  credentialsPending,
  isManagementRole,
  managementBasePath,
  signedInHome,
} from "@/lib/role-hierarchy";
import { complianceApi, complianceMessage, type BankAccount } from "@/lib/compliance-api";
import { createIdempotencyKey } from "@/lib/idempotency-key";

export const Route = createFileRoute("/retailer/bank/")({
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
  accountType: "SAVINGS" as "SAVINGS" | "CURRENT" | "SALARY",
  purposes: ["PAYOUT"] as Array<"PAYOUT" | "DMT">,
};

type BankTab = "AEPS" | "MAIN";

type BankCoordinates = { lat: string; long: string };

function isFullyVerifiedBank(account: BankAccount): boolean {
  return (
    account.status === "ACTIVE" &&
    account.adminReviewStatus === "APPROVED" &&
    account.verificationStatus === "VERIFIED" &&
    account.ownershipStatus === "VERIFIED"
  );
}

function captureBankCoordinates(): Promise<BankCoordinates> {
  if (typeof window === "undefined" || !window.isSecureContext) {
    return Promise.reject(
      new Error(
        "Location is blocked on an insecure address. Open UMOBIPAY through HTTPS or localhost, then try again.",
      ),
    );
  }
  if (!navigator.geolocation) {
    return Promise.reject(new Error("This browser does not support location capture."));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({
          lat: String(coords.latitude),
          long: String(coords.longitude),
        }),
      (error) => {
        const text =
          error.code === error.PERMISSION_DENIED
            ? "Location permission was denied. Allow location for this site and try again."
            : error.code === error.POSITION_UNAVAILABLE
              ? "Current location is unavailable. Turn on device location and try again."
              : "Location capture timed out. Check GPS/network and try again.";
        reject(new Error(text));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  });
}

function BankAccountsPage() {
  const requestKeyRef = useRef<string | null>(null);
  const [activeTab, setActiveTab] = useState<BankTab>("AEPS");
  // Adding the identity's own bank account is mandatory onboarding. Keep it
  // available through its authenticated self-service backend endpoints;
  // administrative review remains protected by BANK_ACCOUNT.* permissions.
  const canManageBank = true;
  const navigate = useNavigate(),
    [session, setSession] = useState<ReturnType<typeof getSession>>(null),
    [accounts, setAccounts] = useState<BankAccount[]>([]),
    [bankDirectory, setBankDirectory] = useState<string[]>([]),
    [form, setForm] = useState(initial),
    [adding, setAdding] = useState(false),
    [editingId, setEditingId] = useState<string | null>(null),
    [editingAccount, setEditingAccount] = useState<BankAccount | null>(null),
    [passbook, setPassbook] = useState<File | null>(null),
    [fileInputKey, setFileInputKey] = useState(0),
    [busy, setBusy] = useState(false),
    [locationBusy, setLocationBusy] = useState(false),
    [coordinates, setCoordinates] = useState<BankCoordinates | null>(null),
    [locationError, setLocationError] = useState(""),
    [loading, setLoading] = useState(true),
    [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  async function load(token: string) {
    setLoading(true);
    try {
      const loaded = await complianceApi.banks(token);
      setAccounts(loaded);
    } catch (e) {
      setMessage({ ok: false, text: complianceMessage(e) });
    } finally {
      setLoading(false);
    }
  }
  async function loadBankDirectory(token: string) {
    try {
      const response = await complianceApi.bankDirectory(token);
      const root =
        response && typeof response === "object" ? (response as Record<string, unknown>) : {};
      const candidates = Array.isArray(response)
        ? response
        : Array.isArray(root.data)
          ? root.data
          : Array.isArray(root.banks)
            ? root.banks
            : [];
      setBankDirectory(
        candidates
          .map((item) =>
            typeof item === "string"
              ? item
              : item && typeof item === "object"
                ? String(
                    (item as Record<string, unknown>).bankName ||
                      (item as Record<string, unknown>).name ||
                      "",
                  )
                : "",
          )
          .filter(Boolean),
      );
    } catch {
      setBankDirectory([]);
    }
  }
  useEffect(() => {
    const value = getSession();
    if (!value) {
      navigate({ to: "/login" });
      return;
    }
    if (credentialsPending(value.identity)) {
      window.location.replace(signedInHome(value));
      return;
    }
    setSession(value);
    setForm((f) => ({ ...f, accountHolderName: value.identity.fullName }));
    void load(value.accessToken);
    void loadBankDirectory(value.accessToken);
    const refreshApprovedState = () => {
      const current = getSession();
      if (current) void load(current.accessToken);
    };
    window.addEventListener("focus", refreshApprovedState);
    window.addEventListener("pageshow", refreshApprovedState);
    return () => {
      window.removeEventListener("focus", refreshApprovedState);
      window.removeEventListener("pageshow", refreshApprovedState);
    };
    // `load` intentionally stays page-local; session identity changes cause a remount.
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
    if (!form.bankName.trim() || !form.accountHolderName.trim())
      return setMessage({ ok: false, text: "Bank name and account holder name are required." });
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifsc.trim().toUpperCase()))
      return setMessage({ ok: false, text: "Enter a valid 11-character IFSC code." });
    if (!editingId && !/^\d{9,18}$/.test(form.accountNumber))
      return setMessage({ ok: false, text: "Account number must contain 9 to 18 digits." });
    if (editingId && form.accountNumber && !/^\d{9,18}$/.test(form.accountNumber))
      return setMessage({ ok: false, text: "Account number must contain 9 to 18 digits." });
    if (form.accountNumber && form.accountNumber !== form.confirm)
      return setMessage({ ok: false, text: "Account numbers do not match." });
    if (!form.purposes.length)
      return setMessage({ ok: false, text: "Select at least one account purpose." });
    const requiresPassbook =
      !editingId ||
      editingAccount?.adminReviewStatus === "REJECTED" ||
      !editingAccount?.passbookOriginalName ||
      Boolean(form.accountNumber) ||
      form.ifsc.trim().toUpperCase() !== editingAccount?.ifsc.toUpperCase() ||
      form.accountHolderName.trim() !== editingAccount?.accountHolderName;
    if (requiresPassbook && !passbook)
      return setMessage({
        ok: false,
        text: "Upload the passbook front (JPG, PNG or PDF, maximum 5 MB) for bank review.",
      });
    setBusy(true);
    try {
      let bankCoordinates = coordinates;
      if (!bankCoordinates) {
        setLocationBusy(true);
        setLocationError("");
        try {
          bankCoordinates = await captureBankCoordinates();
          setCoordinates(bankCoordinates);
        } catch (error) {
          setLocationError(
            error instanceof Error ? error.message : "Location could not be captured.",
          );
          return;
        } finally {
          setLocationBusy(false);
        }
      }
      const payload = {
        bankName: form.bankName.trim(),
        ifsc: form.ifsc.toUpperCase(),
        branchName: form.branchName || undefined,
        accountHolderName: form.accountHolderName.trim(),
        accountType: form.accountType,
        purposes: form.purposes,
        lat: bankCoordinates.lat,
        long: bankCoordinates.long,
        ...(form.accountNumber ? { accountNumber: form.accountNumber } : {}),
        ...(form.accountNumber ? { confirmAccountNumber: form.confirm } : {}),
      };
      const requestKey = requestKeyRef.current ?? createIdempotencyKey("bank-verification");
      requestKeyRef.current = requestKey;
      if (editingId)
        await complianceApi.updateBank(
          activeSession.accessToken,
          editingId,
          payload,
          passbook && requiresPassbook ? passbook : undefined,
        );
      else
        await complianceApi.addBank(
          activeSession.accessToken,
          {
            ...payload,
            accountNumber: form.accountNumber,
            confirmAccountNumber: form.confirm,
          },
          passbook!,
          requestKey,
        );
      requestKeyRef.current = null;
      setForm({ ...initial, accountHolderName: activeSession.identity.fullName });
      setAdding(false);
      setEditingId(null);
      setEditingAccount(null);
      setPassbook(null);
      setFileInputKey((value) => value + 1);
      setCoordinates(null);
      setLocationError("");
      setMessage({
        ok: true,
        text: editingId
          ? "Bank account updated. Review-sensitive changes have been sent for admin approval."
          : "Bank account submitted for admin approval. Provider verification will start after approval.",
      });
      await load(activeSession.accessToken);
    } catch (err) {
      setMessage({ ok: false, text: complianceMessage(err) });
    } finally {
      setBusy(false);
    }
  }
  const verified = accounts.some(isFullyVerifiedBank);
  const filteredAccounts = accounts.filter((a) =>
    activeTab === "AEPS" ? a.purposes.includes("PAYOUT") : a.purposes.includes("DMT"),
  );

  function openAddBank(type: BankTab) {
    setEditingId(null);
    setEditingAccount(null);
    setPassbook(null);
    setFileInputKey((v) => v + 1);
    requestKeyRef.current = null;
    setCoordinates(null);
    setLocationError("");
    setForm({
      ...initial,
      accountHolderName: activeSession.identity.fullName,
      purposes: type === "AEPS" ? ["PAYOUT"] : ["DMT"],
    });
    setAdding(true);
  }

  return (
    <RoleAwareAccountPage
      identity={session.identity}
      section="bank"
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
            <div className="flex gap-2">
              <button
                disabled={!canManageBank}
                onClick={() => openAddBank("AEPS")}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={16} /> Add AEPS Account
              </button>
              <button
                disabled={!canManageBank}
                onClick={() => openAddBank("MAIN")}
                className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={16} /> Add Main Account
              </button>
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <button
              onClick={() => setActiveTab("AEPS")}
              className={`rounded-xl px-5 py-2 text-sm font-bold transition-colors ${
                activeTab === "AEPS"
                  ? "bg-primary text-white"
                  : "border border-border bg-card text-muted-foreground hover:text-secondary"
              }`}
            >
              AEPS Account
            </button>
            <button
              onClick={() => setActiveTab("MAIN")}
              className={`rounded-xl px-5 py-2 text-sm font-bold transition-colors ${
                activeTab === "MAIN"
                  ? "bg-secondary text-white"
                  : "border border-border bg-card text-muted-foreground hover:text-secondary"
              }`}
            >
              Main Account
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
          ) : filteredAccounts.length ? (
            <div className="mt-6 space-y-3">
              {filteredAccounts.map((a) => {
                const isPrimary = activeTab === "AEPS" ? a.isDefault : Boolean(a.isDmtDefault);
                return (
                  <article
                    key={a.id}
                    className="rounded-2xl border border-border bg-background p-5"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <span className="grid h-12 w-12 place-items-center rounded-xl bg-mint text-secondary">
                        <Landmark />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-secondary">{a.bankName}</h3>
                          {isPrimary && (
                            <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">
                              PRIMARY {activeTab === "AEPS" ? "PAYOUT" : "DMT"}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          •••• {a.accountNumberLast4} · {a.accountType} · {a.ifsc}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">{a.accountHolderName}</p>
                        <span
                          className={`mt-2 inline-block rounded-full px-2 py-1 text-[10px] font-extrabold ${
                            a.adminReviewStatus === "APPROVED"
                              ? "bg-emerald-50 text-emerald-700"
                              : a.adminReviewStatus === "REJECTED"
                                ? "bg-red-50 text-red-700"
                                : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          ADMIN REVIEW {a.adminReviewStatus || "PENDING"}
                        </span>
                        {a.adminReviewStatus === "REJECTED" && a.adminReviewReason ? (
                          <p className="mt-2 text-xs font-semibold text-red-600">
                            Reason: {a.adminReviewReason}
                          </p>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-xs font-extrabold ${isFullyVerifiedBank(a) ? "text-emerald-600" : a.adminReviewStatus === "REJECTED" ? "text-red-600" : "text-amber-600"}`}
                        >
                          {isFullyVerifiedBank(a)
                            ? "VERIFIED"
                            : a.adminReviewStatus === "REJECTED"
                              ? "ADMIN REJECTED"
                              : a.adminReviewStatus !== "APPROVED"
                                ? "ADMIN REVIEW PENDING"
                                : `BANK ${a.verificationStatus}`}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Ownership {a.ownershipStatus}
                        </p>
                        <button
                          type="button"
                          onClick={async () => {
                            setBusy(true);
                            setMessage(null);
                            try {
                              const latest = await complianceApi.bank(session.accessToken, a.id);
                              setEditingId(latest.id);
                              setEditingAccount(latest);
                              setPassbook(null);
                              setFileInputKey((value) => value + 1);
                              requestKeyRef.current = null;
                              setAdding(true);
                              setCoordinates(null);
                              setLocationError("");
                              setForm({
                                bankName: latest.bankName,
                                ifsc: latest.ifsc,
                                branchName: latest.branchName || "",
                                accountHolderName: latest.accountHolderName,
                                accountNumber: "",
                                confirm: "",
                                accountType: latest.accountType,
                                purposes: latest.purposes,
                              });
                            } catch (error) {
                              setMessage({ ok: false, text: complianceMessage(error) });
                            } finally {
                              setBusy(false);
                            }
                          }}
                          disabled={!canManageBank || busy}
                          className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary"
                        >
                          <Edit3 size={12} /> Edit
                        </button>
                        {!isPrimary &&
                          a.status === "ACTIVE" &&
                          a.adminReviewStatus === "APPROVED" &&
                          a.verificationStatus === "VERIFIED" &&
                          a.ownershipStatus === "VERIFIED" && (
                            <button
                              disabled={!canManageBank || busy}
                              onClick={async () => {
                                try {
                                  await complianceApi.setPrimary(
                                    session.accessToken,
                                    a.id,
                                    activeTab === "AEPS" ? "PAYOUT" : "DMT",
                                  );
                                  await load(session.accessToken);
                                  setMessage({
                                    ok: true,
                                    text: `Primary ${activeTab === "AEPS" ? "payout" : "DMT"} bank account updated.`,
                                  });
                                } catch (error) {
                                  setMessage({ ok: false, text: complianceMessage(error) });
                                }
                              }}
                              className="ml-3 mt-2 text-xs font-bold text-primary disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Set as primary
                            </button>
                          )}
                        {!a.isDefault && !a.isDmtDefault && (
                          <button
                            disabled={!canManageBank || busy}
                            onClick={async () => {
                              if (
                                !window.confirm(
                                  `Remove ${a.bankName} account ending ${a.accountNumberLast4}?`,
                                )
                              )
                                return;
                              try {
                                await complianceApi.deleteBank(session.accessToken, a.id);
                                await load(session.accessToken);
                                setMessage({ ok: true, text: "Bank account removed." });
                              } catch (error) {
                                setMessage({ ok: false, text: complianceMessage(error) });
                              }
                            }}
                            className="ml-3 mt-2 inline-flex items-center gap-1 text-xs font-bold text-red-600"
                          >
                            <Trash2 size={12} /> Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-border p-12 text-center">
              <Building2 className="mx-auto text-muted-foreground" />
              <p className="mt-3 font-bold text-secondary">
                No {activeTab === "AEPS" ? "AEPS" : "Main"} account connected
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeTab === "AEPS"
                  ? "Add an AEPS account to enable AEPS payouts."
                  : "Add a Main account to enable DMT transfers."}
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
                    list={key === "bankName" ? "supported-bank-directory" : undefined}
                    required={
                      key !== "branchName" &&
                      (!editingId || !["accountNumber", "confirm"].includes(key))
                    }
                    value={form[key as keyof typeof form]}
                    onChange={(e) => {
                      requestKeyRef.current = null;
                      setForm({
                        ...form,
                        [key]:
                          key === "ifsc"
                            ? e.target.value.toUpperCase().slice(0, 11)
                            : key.includes("accountNumber") || key === "confirm"
                              ? e.target.value.replace(/\D/g, "").slice(0, 18)
                              : e.target.value,
                      });
                    }}
                    className="mt-1.5 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm font-normal normal-case outline-none focus:border-primary"
                  />
                </label>
              ))}
              <datalist id="supported-bank-directory">
                {bankDirectory.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
              <label className="text-xs font-bold uppercase text-muted-foreground">
                Account type
                <select
                  value={form.accountType}
                  onChange={(e) => {
                    requestKeyRef.current = null;
                    setForm({
                      ...form,
                      accountType: e.target.value as "SAVINGS" | "CURRENT" | "SALARY",
                    });
                  }}
                  className="mt-1.5 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm"
                >
                  <option value="SAVINGS">Savings</option>
                  <option value="CURRENT">Current</option>
                  <option value="SALARY">Salary</option>
                </select>
              </label>
              <label className="text-xs font-bold uppercase text-muted-foreground">
                Account purpose
                <input
                  value={
                    form.purposes.includes("PAYOUT") ? "AEPS Payout Account" : "Main DMT Account"
                  }
                  disabled
                  className="mt-1.5 w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm font-normal normal-case text-muted-foreground"
                />
              </label>
              <label className="text-xs font-bold uppercase text-muted-foreground sm:col-span-2">
                Passbook front {editingId ? "(required for sensitive changes or resubmission)" : ""}
                <span className="mt-1.5 flex items-center gap-3 rounded-xl border border-dashed border-border bg-card px-4 py-3 normal-case">
                  <FileText size={18} className="shrink-0 text-primary" />
                  <input
                    key={fileInputKey}
                    type="file"
                    required={
                      !editingId ||
                      editingAccount?.adminReviewStatus === "REJECTED" ||
                      !editingAccount?.passbookOriginalName
                    }
                    accept="image/jpeg,image/png,application/pdf"
                    onChange={(event) => {
                      requestKeyRef.current = null;
                      const file = event.target.files?.[0] || null;
                      if (file && file.size > 5 * 1024 * 1024) {
                        event.target.value = "";
                        setPassbook(null);
                        setMessage({ ok: false, text: "Passbook file must be 5 MB or smaller." });
                        return;
                      }
                      setPassbook(file);
                    }}
                    className="w-full text-sm font-normal"
                  />
                </span>
                <span className="mt-1 block font-normal normal-case">
                  JPG, PNG or PDF, maximum 5 MB. Only authorised reviewers can access it.
                </span>
              </label>
              <div className="sm:col-span-2">
                <button
                  type="button"
                  disabled={busy || locationBusy}
                  onClick={async () => {
                    setLocationBusy(true);
                    setLocationError("");
                    requestKeyRef.current = null;
                    try {
                      setCoordinates(await captureBankCoordinates());
                    } catch (error) {
                      setCoordinates(null);
                      setLocationError(
                        error instanceof Error ? error.message : "Location could not be captured.",
                      );
                    } finally {
                      setLocationBusy(false);
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-bold text-secondary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <MapPin size={16} />
                  {locationBusy
                    ? "Capturing location…"
                    : coordinates
                      ? "Location captured"
                      : "Use current location"}
                </button>
                {locationError && (
                  <p role="alert" className="mt-2 text-xs font-semibold text-red-600">
                    {locationError}
                  </p>
                )}
                {!locationError && coordinates && (
                  <p className="mt-2 text-xs font-semibold text-emerald-700">
                    Secure location is ready for bank verification.
                  </p>
                )}
              </div>
              <button
                disabled={!canManageBank || busy}
                className="self-end rounded-xl bg-secondary py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {busy
                  ? "Submitting account…"
                  : editingId
                    ? "Save bank account"
                    : "Submit for review"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setEditingAccount(null);
                    setPassbook(null);
                    setFileInputKey((value) => value + 1);
                    requestKeyRef.current = null;
                    setAdding(false);
                    setCoordinates(null);
                    setLocationError("");
                    setForm({ ...initial, accountHolderName: activeSession.identity.fullName });
                  }}
                  className="rounded-xl border border-border bg-white py-3 text-sm font-bold text-secondary"
                >
                  Cancel edit
                </button>
              )}
            </form>
          )}
        </section>
        <aside className="space-y-4">
          <div className="rounded-2xl bg-secondary p-6 text-white">
            <ShieldCheck />
            <h2 className="mt-4 text-lg font-extrabold">Bank verification</h2>
            <p className="mt-2 text-sm text-white/65">
              Your passbook is reviewed by an administrator first. Provider verification starts only
              after approval.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-extrabold uppercase text-muted-foreground">Next step</p>
            <h3 className="mt-2 font-extrabold text-secondary">Complete business KYC</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              KYC is a separate compliance service and can be started after bank verification.
            </p>
            <Link
              to={
                isManagementRole(session.identity.role)
                  ? `${managementBasePath(session.identity.role)}/profile/kyc`
                  : "/retailer/kyc"
              }
              className={`mt-4 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold ${verified ? "bg-primary text-white" : "pointer-events-none bg-muted text-muted-foreground"}`}
            >
              <BadgeCheck size={16} /> Continue to KYC
            </Link>
          </div>
        </aside>
      </div>
    </RoleAwareAccountPage>
  );
}
