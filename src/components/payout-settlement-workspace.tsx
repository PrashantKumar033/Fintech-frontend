import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  BadgeCheck,
  BanknoteArrowDown,
  Building2,
  CheckCircle2,
  CircleAlert,
  Crosshair,
  History,
  LoaderCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { ActionPermissionNotice } from "@/components/action-permission-notice";
import { MainBankAccountModal } from "@/components/main-bank-account-modal";
import { PayoutHistoryPanel } from "@/components/payout-history-panel";
import { useEffectiveAccess } from "@/hooks/use-effective-access";
import { getSession } from "@/lib/auth-api";
import { complianceApi, type BankAccount } from "@/lib/compliance-api";
import {
  applyDmtBankMutation,
  canHardDeleteDmtAccount,
  canVerifyDmtAccount,
} from "@/lib/bank-account-ui";
import { createIdempotencyKey } from "@/lib/idempotency-key";
import { operationsApi, operationsMessage, type WalletBalances } from "@/lib/operations-api";
import { isPayoutBankEligible, payoutBankPurpose } from "@/lib/payout-bank-eligibility";
import {
  payoutApi,
  payoutMessage,
  type PayoutPaymentMode,
  type PayoutProvider,
  type PayoutSettlement,
  type PayoutSourceWallet,
} from "@/lib/payout-api";
import {
  PAYOUT_TOTAL_DEBIT_LABEL,
  payoutFailureDescription,
  payoutFailureNpciCode,
  payoutProviderPublicCode,
  payoutProviderPublicName,
} from "@/lib/payout-ui";
import { isManagementRole, managementBasePath } from "@/lib/role-hierarchy";
import { UI_PERMISSION } from "@/lib/ui-permissions";
import { formatWalletBalance, isNegativeWalletBalance } from "@/lib/wallet-balance";
import {
  browserLocationMessage,
  getBrowserLocation,
  type BrowserLocation,
} from "@/lib/browser-location";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
});

const MIN_BANK_SKELETON_MS = 450;

type Coordinates = Pick<BrowserLocation, "latitude" | "longitude">;

async function captureLocation(forceRefresh = false): Promise<Coordinates> {
  const location = await getBrowserLocation({
    forceRefresh,
    allowMockDevelopmentFallback: true,
  });
  return {
    latitude: Number(location.latitude.toFixed(6)),
    longitude: Number(location.longitude.toFixed(6)),
  };
}

function settlementTone(status: PayoutSettlement["status"]): string {
  if (status === "SUCCESS") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "FAILED") return "border-red-200 bg-red-50 text-red-900";
  return "border-amber-200 bg-amber-50 text-amber-950";
}

function MainBankAccountChooser({
  accounts,
  loading,
  selectedId,
  verifyingBankId,
  deletingBankId,
  notice,
  addFormOpen,
  onAdd,
  onSelect,
  onVerify,
  onDelete,
}: {
  accounts: BankAccount[];
  loading: boolean;
  selectedId: string;
  verifyingBankId: string | null;
  deletingBankId: string | null;
  notice: { ok: boolean; text: string } | null;
  addFormOpen: boolean;
  onAdd: () => void;
  onSelect: (account: BankAccount) => void;
  onVerify: (account: BankAccount) => void;
  onDelete: (account: BankAccount) => void;
}) {
  return (
    <aside aria-busy={loading} className="rounded-2xl border border-border bg-muted/30 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-primary">
            Main bank accounts
          </p>
          <h3 className="mt-1 text-lg font-black text-secondary">Choose payout account</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Select one verified Main account. The selected radio button is the payout destination.
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          disabled={loading || addFormOpen}
          aria-expanded={addFormOpen}
          aria-controls="add-main-bank-modal"
          className="inline-flex items-center gap-2 rounded-xl bg-secondary px-3.5 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:brightness-95 disabled:cursor-default disabled:opacity-60"
        >
          {loading ? <LoaderCircle size={15} className="animate-spin" /> : <Plus size={15} />}
          {loading ? "Loading accounts…" : addFormOpen ? "Form open" : "Add bank account"}
        </button>
      </div>

      {notice ? (
        <p
          className={`mt-4 rounded-xl border p-3 text-xs font-bold ${notice.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}
        >
          {notice.text}
        </p>
      ) : null}

      <div className="mt-4 space-y-3">
        {loading ? (
          <div role="status" aria-live="polite" className="space-y-3">
            <span className="sr-only">Loading Main payout bank accounts</span>
            {[0, 1].map((item) => (
              <div
                key={item}
                aria-hidden="true"
                className="animate-pulse rounded-2xl border border-border bg-white p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 shrink-0 rounded-full bg-secondary/15" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="h-4 w-28 rounded-full bg-secondary/15" />
                      <div className="h-5 w-14 rounded-full bg-secondary/10" />
                    </div>
                    <div className="mt-3 h-3 w-36 rounded-full bg-secondary/10" />
                    <div className="mt-2 h-3 w-28 rounded-full bg-secondary/10" />
                  </div>
                </div>
                <div className="mt-4 border-t border-border/70 pt-3">
                  <div className="h-8 w-24 rounded-lg bg-secondary/10" />
                </div>
              </div>
            ))}
          </div>
        ) : accounts.length ? (
          accounts.map((account) => {
            const eligible = isPayoutBankEligible(account, "MAIN");
            const selected = account.id === selectedId;
            const verifying = account.id === verifyingBankId;
            const deleting = account.id === deletingBankId;
            const verificationComplete = account.verificationStatus === "VERIFIED";
            const verificationFailed = ["REJECTED", "FAILED"].includes(account.verificationStatus);
            return (
              <article
                key={account.id}
                className={`rounded-2xl border bg-white p-4 transition ${selected ? "border-primary ring-2 ring-primary/15" : "border-border"}`}
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <label
                    className={`flex min-w-0 items-start gap-3 text-left ${eligible && !verifying && !deleting ? "cursor-pointer" : "cursor-not-allowed"}`}
                  >
                    <input
                      type="radio"
                      name="main-payout-bank-account"
                      value={account.id}
                      checked={selected}
                      onChange={() => onSelect(account)}
                      disabled={!eligible || verifying || deleting}
                      className="mt-1 h-5 w-5 shrink-0 accent-primary disabled:opacity-40"
                      aria-label={`Use ${account.bankName} ending ${account.accountNumberLast4} for this payout`}
                    />
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-sm text-secondary">
                        {account.bankName}
                      </strong>
                      <span className="mt-1 block text-xs font-bold text-muted-foreground">
                        •••• {account.accountNumberLast4} · {account.accountType}
                      </span>
                      <span className="mt-1 block text-[11px] text-muted-foreground">
                        IFSC {account.ifsc}
                      </span>
                    </span>
                  </label>

                  <div className="flex items-center gap-2">
                    <span
                      title={`Verification status: ${account.verificationStatus.replaceAll("_", " ")}`}
                      className={`rounded-full px-2 py-0.5 text-[9px] font-black ${verificationComplete ? "bg-emerald-50 text-emerald-700" : verificationFailed ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"}`}
                    >
                      {account.verificationStatus.replaceAll("_", " ")}
                    </span>
                    {canHardDeleteDmtAccount(account) ? (
                      <button
                        type="button"
                        onClick={() => onDelete(account)}
                        disabled={Boolean(verifyingBankId || deletingBankId)}
                        title="Delete permanently"
                        aria-label={`Delete ${account.bankName} account ending ${account.accountNumberLast4} permanently`}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                      >
                        {deleting ? (
                          <LoaderCircle size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    ) : null}
                  </div>
                </div>

                {!eligible ? (
                  <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-900">
                    {verificationComplete
                      ? "This verified account is not currently available for a Main wallet payout."
                      : "Verify this account before choosing it for a Main wallet payout."}
                  </p>
                ) : null}

                {canVerifyDmtAccount(account) ? (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-border/70 pt-3">
                    <button
                      type="button"
                      onClick={() => onVerify(account)}
                      disabled={Boolean(verifyingBankId || deletingBankId)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-extrabold text-white disabled:opacity-50"
                    >
                      {verifying ? (
                        <LoaderCircle size={14} className="animate-spin" />
                      ) : (
                        <ShieldCheck size={14} />
                      )}
                      {verifying ? "Verifying…" : "Verify"}
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-white p-8 text-center">
            <Building2 className="mx-auto text-muted-foreground" size={24} />
            <p className="mt-3 text-sm font-black text-secondary">No Main bank account added</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Add a Main bank account to verify it and use it for fund transfers.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}

export function PayoutSettlementWorkspace({
  fixedSourceWallet,
}: {
  fixedSourceWallet?: PayoutSourceWallet;
}) {
  const [view, setView] = useState<"create" | "history">("create");

  return (
    <>
      <div className="mb-5 flex w-fit max-w-full gap-1 overflow-x-auto rounded-2xl border border-border bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setView("create")}
          className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-5 py-3 text-sm font-black ${view === "create" ? "bg-primary text-white" : "text-secondary"}`}
        >
          <Plus size={16} /> New payout
        </button>
        <button
          type="button"
          onClick={() => setView("history")}
          className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-5 py-3 text-sm font-black ${view === "history" ? "bg-primary text-white" : "text-secondary"}`}
        >
          <History size={16} /> Payout history
        </button>
      </div>

      {view === "create" ? (
        <CreatePayoutSettlementPanel fixedSourceWallet={fixedSourceWallet} />
      ) : (
        <PayoutHistoryPanel />
      )}
    </>
  );
}

function CreatePayoutSettlementPanel({
  fixedSourceWallet,
}: {
  fixedSourceWallet?: PayoutSourceWallet;
}) {
  const session = getSession();
  const accessToken = session?.accessToken;
  const { can } = useEffectiveAccess();
  const allowed = can(UI_PERMISSION.PAYOUT_SETTLEMENT_CREATE, ["RETAILER"]);
  const [providers, setProviders] = useState<PayoutProvider[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [balances, setBalances] = useState<WalletBalances | null>(null);
  const [providerCode, setProviderCode] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [sourceWallet, setSourceWallet] = useState<PayoutSourceWallet>(fixedSourceWallet ?? "AEPS");
  const [paymentMode, setPaymentMode] = useState<PayoutPaymentMode>("IMPS");
  const [amount, setAmount] = useState("");
  const [tpin, setTpin] = useState("");
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(true);
  const [bankAccountsLoading, setBankAccountsLoading] = useState(true);
  const [locationBusy, setLocationBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [confirmationError, setConfirmationError] = useState("");
  const [error, setError] = useState("");
  const [bankActionNotice, setBankActionNotice] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [addingMainBank, setAddingMainBank] = useState(false);
  const [verifyingBankId, setVerifyingBankId] = useState<string | null>(null);
  const [deletingBankId, setDeletingBankId] = useState<string | null>(null);
  const [result, setResult] = useState<PayoutSettlement | null>(null);
  const idempotencyKey = useRef<string | null>(null);
  const bankAccountsRequest = useRef(0);

  const eligibleAccounts = useMemo(
    () => accounts.filter((account) => isPayoutBankEligible(account, sourceWallet)),
    [accounts, sourceWallet],
  );
  const mainAccounts = useMemo(
    () => accounts.filter((account) => account.purposes.includes("DMT")),
    [accounts],
  );
  const selectedAccount = eligibleAccounts.find((account) => account.id === bankAccountId);
  const selectedProvider = providers.find(
    (provider) => payoutProviderPublicCode(provider) === providerCode,
  );
  const resultProvider = result
    ? providers.find((provider) => payoutProviderPublicCode(provider) === result.providerCode)
    : undefined;
  const resultFailureDescription = result ? payoutFailureDescription(result) : null;
  const resultNpciCode = result ? payoutFailureNpciCode(result) : null;
  const aepsBalance = Number(balances?.wallets.aeps ?? 0);
  const mainBalance = Number(balances?.wallets.main ?? 0);
  const mainAvailableBalance = Number(balances?.wallets.mainAvailable ?? mainBalance);
  const selectedWalletBalance = sourceWallet === "AEPS" ? aepsBalance : mainAvailableBalance;
  const selectedWalletLabel = sourceWallet === "AEPS" ? "AEPS" : "Main";
  const bankAccountsPath = isManagementRole(session?.identity.role)
    ? `${managementBasePath(session?.identity.role)}/profile/bank`
    : "/retailer/bank";
  const payoutServiceDisabled = error
    .toLowerCase()
    .includes("payout service is temporarily unavailable");

  const load = useCallback(async () => {
    if (!accessToken || !allowed) {
      bankAccountsRequest.current += 1;
      setLoading(false);
      setBankAccountsLoading(false);
      return;
    }

    setLoading(true);
    setBankAccountsLoading(true);
    setError("");
    const failures: string[] = [];
    const bankRequestId = ++bankAccountsRequest.current;
    const bankLoadingStartedAt = Date.now();
    const finishBankLoading = async () => {
      const remaining = MIN_BANK_SKELETON_MS - (Date.now() - bankLoadingStartedAt);
      if (remaining > 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, remaining));
      }
    };
    const bankRequest = (async () => {
      try {
        const loadedAccounts = await complianceApi.banks(accessToken);
        await finishBankLoading();
        if (bankAccountsRequest.current === bankRequestId) {
          setAccounts(loadedAccounts);
          setBankAccountsLoading(false);
        }
        return loadedAccounts;
      } catch (requestError) {
        await finishBankLoading();
        if (bankAccountsRequest.current === bankRequestId) {
          setAccounts([]);
          setBankAccountsLoading(false);
        }
        throw requestError;
      }
    })();
    const [providerResult, bankResult, balanceResult] = await Promise.allSettled([
      payoutApi.providers(accessToken),
      bankRequest,
      operationsApi.balances(accessToken),
    ]);

    if (providerResult.status === "fulfilled") {
      setProviders(providerResult.value);
      setProviderCode(
        (current) => current || payoutProviderPublicCode(providerResult.value[0]) || "",
      );
    } else {
      setProviders([]);
      failures.push(payoutMessage(providerResult.reason));
    }

    if (bankResult.status === "rejected") {
      failures.push(payoutMessage(bankResult.reason));
    }

    if (balanceResult.status === "fulfilled") {
      setBalances(balanceResult.value);
    } else {
      setBalances(null);
      failures.push(operationsMessage(balanceResult.reason));
    }
    setError(failures.join(" "));
    setLoading(false);
  }, [accessToken, allowed]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!fixedSourceWallet) return;
    setSourceWallet(fixedSourceWallet);
    setBankAccountId("");
    idempotencyKey.current = null;
    setResult(null);
    setReviewing(false);
  }, [fixedSourceWallet]);

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    setLocationBusy(true);
    captureLocation()
      .then((location) => {
        if (active) setCoordinates(location);
      })
      .catch((locationFailure) => {
        if (active) setError(browserLocationMessage(locationFailure));
      })
      .finally(() => {
        if (active) setLocationBusy(false);
      });
    return () => {
      active = false;
    };
  }, [allowed]);

  useEffect(() => {
    setBankAccountId((current) =>
      eligibleAccounts.some((account) => account.id === current)
        ? current
        : fixedSourceWallet === "MAIN"
          ? ""
          : eligibleAccounts[0]?.id || "",
    );
  }, [eligibleAccounts, fixedSourceWallet]);

  function resetIntent() {
    idempotencyKey.current = null;
    setResult(null);
  }

  async function requestCurrentLocation() {
    setLocationBusy(true);
    setError("");
    try {
      setCoordinates(await captureLocation(true));
      resetIntent();
    } catch (requestError) {
      setError(payoutMessage(requestError));
    } finally {
      setLocationBusy(false);
    }
  }

  async function verifyMainBankAccount(account: BankAccount) {
    if (!accessToken || verifyingBankId || deletingBankId) return;
    setBankActionNotice(null);
    setVerifyingBankId(account.id);
    try {
      const location = await captureLocation(true);
      const response = await complianceApi.verifyDmtBank(accessToken, account.id, {
        lat: String(location.latitude),
        long: String(location.longitude),
      });
      if (!response.success) {
        throw new Error(
          response.message || "The bank-account verification could not be completed.",
        );
      }
      const refreshedAccounts = await complianceApi.banks(accessToken);
      setAccounts(refreshedAccounts);
      if (isPayoutBankEligible(response.bankAccount, "MAIN")) {
        setBankAccountId(response.bankAccount.id);
      }
      setBankActionNotice({
        ok: true,
        text: response.message || "Main bank account verified and selected.",
      });
    } catch (requestError) {
      setBankActionNotice({ ok: false, text: payoutMessage(requestError) });
    } finally {
      setVerifyingBankId(null);
    }
  }

  async function permanentlyDeleteMainBankAccount(account: BankAccount) {
    if (!accessToken || verifyingBankId || deletingBankId) return;
    if (
      !window.confirm(
        `Permanently delete ${account.bankName} account ending ${account.accountNumberLast4}?`,
      )
    )
      return;

    setBankActionNotice(null);
    setDeletingBankId(account.id);
    try {
      await complianceApi.hardDeleteDmtBank(accessToken, account.id);
      setAccounts((current) => current.filter((item) => item.id !== account.id));
      setBankAccountId((current) => (current === account.id ? "" : current));
      resetIntent();
      setBankActionNotice({ ok: true, text: "Main bank account permanently deleted." });
    } catch (requestError) {
      setBankActionNotice({ ok: false, text: payoutMessage(requestError) });
    } finally {
      setDeletingBankId(null);
    }
  }

  async function mainBankAccountCreated(account: BankAccount, message: string) {
    setAccounts((current) =>
      applyDmtBankMutation(current, { success: true, bankAccount: account }),
    );
    setBankActionNotice({ ok: true, text: message });
    setAddingMainBank(false);
    if (!accessToken) return;
    const refreshedAccounts = await complianceApi.banks(accessToken).catch(() => null);
    if (refreshedAccounts) setAccounts(refreshedAccounts);
  }

  function validateIntent(): boolean {
    const numericAmount = Number(amount);
    if (
      !providerCode ||
      !providers.some((provider) => payoutProviderPublicCode(provider) === providerCode)
    ) {
      setError("Select an available payout provider.");
      return false;
    }
    if (!selectedAccount) {
      setError(
        `Select an active, approved and verified ${selectedWalletLabel} wallet payout bank account.`,
      );
      return false;
    }
    if (!/^\d+(?:\.\d{1,2})?$/.test(amount) || !Number.isFinite(numericAmount)) {
      setError("Enter a valid payout amount with maximum 2 decimal places.");
      return false;
    }
    if (numericAmount < 100) {
      setError("Minimum payout amount is ₹100.00.");
      return false;
    }
    if (numericAmount > 49_000) {
      setError("Maximum payout amount is ₹49,000.00 per request.");
      return false;
    }
    if (numericAmount > selectedWalletBalance) {
      setError(`Payout amount cannot exceed your available ${selectedWalletLabel} wallet balance.`);
      return false;
    }
    if (!coordinates) {
      setError("Capture your current location before reviewing the payout.");
      return false;
    }
    return true;
  }

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!allowed || !validateIntent()) return;
    setTpin("");
    setConfirmationError("");
    setReviewing(true);
  }

  async function confirm() {
    if (!accessToken || !allowed || submitting || !coordinates || !validateIntent()) return;
    if (!/^\d{4,6}$/.test(tpin)) {
      setConfirmationError("Enter your valid 4 to 6 digit financial TPIN.");
      return;
    }
    setSubmitting(true);
    setError("");
    setConfirmationError("");
    idempotencyKey.current ||= createIdempotencyKey("payout");
    try {
      const settlement = await payoutApi.createSettlement(
        accessToken,
        providerCode,
        {
          bankAccountId,
          amount: Number(amount),
          paymentMode,
          sourceWallet,
          tpin,
          ...coordinates,
        },
        idempotencyKey.current,
      );
      setResult(settlement);
      setReviewing(false);
      setAmount("");
      setTpin("");
      idempotencyKey.current = null;
      const refreshed = await operationsApi.balances(accessToken).catch(() => null);
      if (refreshed) setBalances(refreshed);
    } catch (requestError) {
      // Keep the same idempotency key. A retry after a timeout cannot create a
      // second settlement for the same intent.
      setConfirmationError(payoutMessage(requestError));
      setTpin("");
    } finally {
      setSubmitting(false);
    }
  }

  if (!session) return null;

  return (
    <>
      {!allowed ? (
        <ActionPermissionNotice
          permission={UI_PERMISSION.PAYOUT_SETTLEMENT_CREATE}
          title="Payout settlement is not enabled"
        />
      ) : null}

      {error ? (
        <div className="mb-5 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          <CircleAlert className="mt-0.5 shrink-0" size={18} />
          <div>
            <p>{error}</p>
            {payoutServiceDisabled ? (
              <p className="mt-1 font-medium text-red-700">
                A Super Admin must enable the PAYOUT master switch after confirming the commercial
                configuration and provider readiness.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {result ? (
        <section className={`mb-5 rounded-2xl border p-5 ${settlementTone(result.status)}`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex gap-3">
              {result.status === "SUCCESS" ? (
                <BadgeCheck className="mt-0.5 shrink-0" size={22} />
              ) : (
                <CircleAlert className="mt-0.5 shrink-0" size={22} />
              )}
              <div>
                <p className="text-xs font-black uppercase tracking-wide">Payout response</p>
                <h2 className="mt-1 text-xl font-black">{result.status.replaceAll("_", " ")}</h2>
                <p className="mt-1 text-sm">
                  {result.status === "SUCCESS"
                    ? "The provider accepted the settlement and the wallet debit was captured."
                    : result.status === "FAILED"
                      ? resultFailureDescription
                      : "The payout is still being processed. Do not create another payout for the same transfer."}
                </p>
                {resultNpciCode ? (
                  <p className="mt-1 text-xs font-bold">NPCI code: {resultNpciCode}</p>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setResult(null)}
              className="grid h-9 w-9 place-items-center rounded-xl border border-current/20"
              aria-label="Close payout response"
            >
              <X size={17} />
            </button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Reference", result.merchantRefId],
              ["Payout amount", inr.format(Number(result.amount))],
              ["Surcharge", inr.format(Number(result.surcharge.amount))],
              [PAYOUT_TOTAL_DEBIT_LABEL, inr.format(Number(result.totalWalletDebit))],
              ["Mode", result.paymentMode],
              [
                "Bank account",
                `•••• ${result.bankAccount?.last4 || selectedAccount?.accountNumberLast4 || "—"}`,
              ],
              ["Wallet state", result.walletState.replaceAll("_", " ")],
              ["Provider", payoutProviderPublicName(resultProvider ?? result)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-white/65 p-3">
                <p className="text-[10px] font-black uppercase opacity-65">{label}</p>
                <p className="mt-1 break-all text-sm font-extrabold">{value}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              <BanknoteArrowDown size={23} />
            </span>
            <div>
              <h2 className="text-xl font-black text-secondary">
                {sourceWallet === "AEPS" ? "AEPS wallet settlement" : "Main wallet fund transfer"}
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                {sourceWallet === "AEPS"
                  ? "Settle AEPS wallet funds into your approved AEPS payout bank account through an available provider."
                  : "Transfer Main wallet funds into your approved Main wallet payout bank account through an available provider."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading || !allowed}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold disabled:opacity-50"
          >
            <RefreshCw className={loading ? "animate-spin" : ""} size={16} /> Refresh
          </button>
        </div>

        <div
          className={`mt-5 grid gap-4 sm:grid-cols-2 ${fixedSourceWallet ? "xl:grid-cols-3" : "xl:grid-cols-4"}`}
        >
          {(!fixedSourceWallet || sourceWallet === "AEPS") && (
            <div
              className={`rounded-2xl border p-4 ${isNegativeWalletBalance(aepsBalance) ? "border-red-200 bg-red-50" : "border-transparent bg-muted"}`}
            >
              <p className="text-xs font-black uppercase text-muted-foreground">
                AEPS wallet balance
              </p>
              <p
                className={`mt-2 text-2xl font-black tabular-nums ${isNegativeWalletBalance(aepsBalance) ? "text-red-700" : "text-secondary"}`}
              >
                {loading ? "—" : formatWalletBalance(aepsBalance)}
              </p>
            </div>
          )}
          {(!fixedSourceWallet || sourceWallet === "MAIN") && (
            <div
              className={`rounded-2xl border p-4 ${isNegativeWalletBalance(mainAvailableBalance) ? "border-red-200 bg-red-50" : "border-transparent bg-muted"}`}
            >
              <p className="text-xs font-black uppercase text-muted-foreground">
                Main wallet balance
              </p>
              <p
                className={`mt-2 text-2xl font-black tabular-nums ${isNegativeWalletBalance(mainAvailableBalance) ? "text-red-700" : "text-secondary"}`}
              >
                {loading ? "—" : formatWalletBalance(mainAvailableBalance)}
              </p>
            </div>
          )}
          <div className="rounded-2xl bg-muted p-4">
            <p className="text-xs font-black uppercase text-muted-foreground">
              {selectedWalletLabel} payout banks
            </p>
            <p className="mt-2 text-2xl font-black text-secondary">
              {loading ? "—" : eligibleAccounts.length}
            </p>
          </div>
          <div className="rounded-2xl bg-muted p-4">
            <p className="text-xs font-black uppercase text-muted-foreground">Providers online</p>
            <p className="mt-2 text-2xl font-black text-secondary">
              {loading ? "—" : providers.length}
            </p>
          </div>
        </div>

        {!loading && allowed && eligibleAccounts.length === 0 && fixedSourceWallet !== "MAIN" ? (
          <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <Building2 className="shrink-0" size={19} />
              <p>
                No {selectedWalletLabel} wallet payout bank is available. Select an active, verified
                account enabled for this wallet ({payoutBankPurpose(sourceWallet)} purpose).
              </p>
            </div>
            <a
              href={`${bankAccountsPath}?add=${sourceWallet}`}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-900 px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-amber-950"
            >
              <Plus size={15} /> Add {selectedWalletLabel} bank account
            </a>
          </div>
        ) : null}

        <div
          className={`mt-6 ${fixedSourceWallet === "MAIN" ? "grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]" : ""}`}
        >
          <form onSubmit={review} className="grid content-start gap-5 md:grid-cols-2">
            <label className="text-sm font-bold text-secondary">
              Payout provider
              <select
                required
                value={providerCode}
                onChange={(event) => {
                  setProviderCode(event.target.value);
                  resetIntent();
                }}
                disabled={!allowed || loading || providers.length === 0}
                className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 outline-none focus:border-primary disabled:bg-muted"
              >
                <option value="">Select provider</option>
                {providers.map((provider) => {
                  const code = payoutProviderPublicCode(provider);
                  return (
                    <option key={code} value={code}>
                      {payoutProviderPublicName(provider)}
                    </option>
                  );
                })}
              </select>
            </label>

            <label className="text-sm font-bold text-secondary">
              Payment mode
              <select
                value={paymentMode}
                onChange={(event) => {
                  setPaymentMode(event.target.value as PayoutPaymentMode);
                  resetIntent();
                }}
                disabled={!allowed || loading}
                className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 outline-none focus:border-primary disabled:bg-muted"
              >
                <option value="IMPS">IMPS</option>
                <option value="NEFT">NEFT</option>
              </select>
            </label>

            {fixedSourceWallet !== "MAIN" ? (
              <label className="text-sm font-bold text-secondary">
                {selectedWalletLabel} payout bank account
                <select
                  required
                  value={bankAccountId}
                  onChange={(event) => {
                    setBankAccountId(event.target.value);
                    resetIntent();
                  }}
                  disabled={!allowed || loading || eligibleAccounts.length === 0}
                  className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 outline-none focus:border-primary disabled:bg-muted"
                >
                  <option value="">Select {selectedWalletLabel} enabled bank</option>
                  {eligibleAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.bankName} •••• {account.accountNumberLast4} ({account.accountType})
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {!fixedSourceWallet ? (
              <label className="text-sm font-bold text-secondary">
                Debit from wallet
                <select
                  value={sourceWallet}
                  onChange={(event) => {
                    const nextWallet = event.target.value as PayoutSourceWallet;
                    setSourceWallet(nextWallet);
                    resetIntent();
                  }}
                  disabled={!allowed || loading}
                  className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 outline-none focus:border-primary disabled:bg-muted"
                >
                  <option value="AEPS">AEPS wallet — {formatWalletBalance(aepsBalance)}</option>
                  <option value="MAIN">Main wallet — {formatWalletBalance(mainBalance)}</option>
                </select>
              </label>
            ) : null}

            <label
              className={`text-sm font-bold text-secondary ${fixedSourceWallet === "MAIN" ? "md:col-span-2" : ""}`}
            >
              Amount
              <input
                required
                type="number"
                min={100}
                max={49_000}
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value.replace(/[^0-9.]/g, ""));
                  resetIntent();
                }}
                placeholder="0.00"
                disabled={!allowed || loading}
                className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 outline-none focus:border-primary disabled:bg-muted"
              />
              <span className="mt-1 block text-xs font-medium text-muted-foreground">
                Allowed range: ₹100.00 – ₹49,000.00
              </span>
            </label>

            <div className="rounded-2xl border border-border bg-muted/50 p-4 md:col-span-2">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black text-secondary">Transaction location</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {coordinates
                      ? `Captured: ${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`
                      : "Location is required by the payout contract."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void requestCurrentLocation()}
                  disabled={!allowed || locationBusy}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-bold disabled:opacity-50"
                >
                  {locationBusy ? (
                    <LoaderCircle className="animate-spin" size={17} />
                  ) : (
                    <Crosshair size={17} />
                  )}
                  {coordinates ? "Refresh location" : "Use current location"}
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-amber-50 p-4 text-xs leading-5 text-amber-900 md:col-span-2">
              The configured payout surcharge is added to the requested amount and the total is
              debited from your {selectedWalletLabel} wallet. Each wallet has its own surcharge
              configuration; the exact surcharge and total debit are returned with the payout
              result.
            </div>

            <button
              disabled={
                !allowed || loading || providers.length === 0 || !selectedAccount || submitting
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50 md:col-span-2"
            >
              <ShieldCheck size={18} /> Review payout
            </button>
          </form>

          {fixedSourceWallet === "MAIN" ? (
            <MainBankAccountChooser
              accounts={mainAccounts}
              loading={bankAccountsLoading}
              selectedId={bankAccountId}
              verifyingBankId={verifyingBankId}
              deletingBankId={deletingBankId}
              notice={bankActionNotice}
              addFormOpen={addingMainBank}
              onAdd={() => {
                setBankActionNotice(null);
                setAddingMainBank(true);
              }}
              onSelect={(account) => {
                setBankAccountId(account.id);
                resetIntent();
              }}
              onVerify={(account) => void verifyMainBankAccount(account)}
              onDelete={(account) => void permanentlyDeleteMainBankAccount(account)}
            />
          ) : null}
        </div>
      </section>

      {fixedSourceWallet === "MAIN" && addingMainBank && accessToken ? (
        <MainBankAccountModal
          accessToken={accessToken}
          accountHolderName={session.identity.fullName}
          onClose={() => setAddingMainBank(false)}
          onCreated={mainBankAccountCreated}
        />
      ) : null}

      {reviewing && selectedAccount && selectedProvider && coordinates ? (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-secondary/65 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-primary">
                  Financial confirmation
                </p>
                <h2 className="mt-1 text-2xl font-black text-secondary">Confirm payout</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReviewing(false);
                  setTpin("");
                  setConfirmationError("");
                }}
                disabled={submitting}
                className="grid h-10 w-10 place-items-center rounded-xl border border-border"
                aria-label="Close payout confirmation"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 space-y-3 rounded-2xl bg-muted/60 p-4 text-sm">
              {[
                ["Amount", inr.format(Number(amount))],
                ["From", `${selectedWalletLabel} wallet`],
                ["To", `${selectedAccount.bankName} •••• ${selectedAccount.accountNumberLast4}`],
                ["Mode", paymentMode],
                ["Provider", payoutProviderPublicName(selectedProvider)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-start justify-between gap-5 border-b border-border/70 pb-3 last:border-0 last:pb-0"
                >
                  <span className="text-muted-foreground">{label}</span>
                  <strong className="text-right text-secondary">{value}</strong>
                </div>
              ))}
            </div>

            <label className="mt-4 block text-sm font-bold text-secondary">
              Financial TPIN
              <input
                required
                type="password"
                inputMode="numeric"
                autoComplete="off"
                minLength={4}
                maxLength={6}
                value={tpin}
                onChange={(event) => {
                  setTpin(event.target.value.replace(/\D/g, "").slice(0, 6));
                  setConfirmationError("");
                }}
                placeholder="4–6 digit TPIN"
                className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-center text-lg font-black tracking-[0.4em] outline-none focus:border-primary"
              />
              <span className="mt-1 block text-xs font-medium text-muted-foreground">
                Your TPIN is verified securely and is never included in the payout command.
              </span>
            </label>

            {confirmationError ? (
              <p className="mt-3 flex gap-2 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
                <CircleAlert className="shrink-0" size={17} /> {confirmationError}
              </p>
            ) : null}

            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
              The backend will verify your TPIN, calculate the active surcharge, reserve the total
              {` ${selectedWalletLabel} debit`} and submit this payout immediately. Verify the bank
              and amount carefully.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setReviewing(false);
                  setTpin("");
                  setConfirmationError("");
                }}
                disabled={submitting}
                className="rounded-xl border border-border py-3 text-sm font-bold text-secondary"
              >
                Edit details
              </button>
              <button
                type="button"
                onClick={() => void confirm()}
                disabled={submitting || !/^\d{4,6}$/.test(tpin)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-black text-white disabled:opacity-50"
              >
                {submitting ? (
                  <LoaderCircle className="animate-spin" size={18} />
                ) : (
                  <BanknoteArrowDown size={18} />
                )}
                {submitting ? "Processing payout…" : "Confirm payout"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
