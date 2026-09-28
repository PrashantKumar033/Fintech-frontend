import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  BadgeCheck,
  BanknoteArrowDown,
  Building2,
  CircleAlert,
  Crosshair,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import { ActionPermissionNotice } from "@/components/action-permission-notice";
import { useEffectiveAccess } from "@/hooks/use-effective-access";
import { getSession } from "@/lib/auth-api";
import { complianceApi, type BankAccount } from "@/lib/compliance-api";
import { createIdempotencyKey } from "@/lib/idempotency-key";
import { operationsApi, operationsMessage, type WalletBalances } from "@/lib/operations-api";
import {
  payoutApi,
  payoutMessage,
  type PayoutPaymentMode,
  type PayoutProvider,
  type PayoutSettlement,
} from "@/lib/payout-api";
import { UI_PERMISSION } from "@/lib/ui-permissions";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
});

type Coordinates = { latitude: number; longitude: number };

function isPayoutEligible(account: BankAccount): boolean {
  return (
    account.status === "ACTIVE" &&
    account.adminReviewStatus === "APPROVED" &&
    account.verificationStatus === "VERIFIED" &&
    account.ownershipStatus === "VERIFIED" &&
    account.purposes.includes("PAYOUT")
  );
}

function captureLocation(): Promise<Coordinates> {
  if (!navigator.geolocation) {
    return Promise.reject(new Error("This browser does not support secure location capture."));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({
          latitude: Number(coords.latitude.toFixed(6)),
          longitude: Number(coords.longitude.toFixed(6)),
        }),
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? "Location permission was denied. Allow location for this site and try again."
            : error.code === error.POSITION_UNAVAILABLE
              ? "Current location is unavailable. Turn on device location and try again."
              : "Location capture timed out. Please try again.";
        reject(new Error(message));
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    );
  });
}

function settlementTone(status: PayoutSettlement["status"]): string {
  if (status === "SUCCESS") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "FAILED") return "border-red-200 bg-red-50 text-red-900";
  return "border-amber-200 bg-amber-50 text-amber-950";
}

export function PayoutSettlementWorkspace() {
  const session = getSession();
  const accessToken = session?.accessToken;
  const { can } = useEffectiveAccess();
  const allowed = can(UI_PERMISSION.PAYOUT_SETTLEMENT_CREATE, [
    "MASTER_DISTRIBUTOR",
    "DISTRIBUTOR",
    "RETAILER",
  ]);
  const [providers, setProviders] = useState<PayoutProvider[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [balances, setBalances] = useState<WalletBalances | null>(null);
  const [providerCode, setProviderCode] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [paymentMode, setPaymentMode] = useState<PayoutPaymentMode>("IMPS");
  const [amount, setAmount] = useState("");
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationBusy, setLocationBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PayoutSettlement | null>(null);
  const idempotencyKey = useRef<string | null>(null);

  const eligibleAccounts = useMemo(() => accounts.filter(isPayoutEligible), [accounts]);
  const selectedAccount = eligibleAccounts.find((account) => account.id === bankAccountId);
  const selectedProvider = providers.find((provider) => provider.providerCode === providerCode);
  const aepsBalance = Number(balances?.wallets.aeps ?? 0);

  const load = useCallback(async () => {
    if (!accessToken || !allowed) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    const failures: string[] = [];
    const [providerResult, bankResult, balanceResult] = await Promise.allSettled([
      payoutApi.providers(accessToken),
      complianceApi.banks(accessToken),
      operationsApi.balances(accessToken),
    ]);

    if (providerResult.status === "fulfilled") {
      setProviders(providerResult.value);
      setProviderCode((current) => current || providerResult.value[0]?.providerCode || "");
    } else {
      setProviders([]);
      failures.push(payoutMessage(providerResult.reason));
    }

    if (bankResult.status === "fulfilled") {
      setAccounts(bankResult.value);
      const firstEligible = bankResult.value.find(isPayoutEligible);
      setBankAccountId((current) =>
        bankResult.value.some((account) => account.id === current && isPayoutEligible(account))
          ? current
          : firstEligible?.id || "",
      );
    } else {
      setAccounts([]);
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

  function resetIntent() {
    idempotencyKey.current = null;
    setResult(null);
  }

  async function requestCurrentLocation() {
    setLocationBusy(true);
    setError("");
    try {
      setCoordinates(await captureLocation());
      resetIntent();
    } catch (requestError) {
      setError(payoutMessage(requestError));
    } finally {
      setLocationBusy(false);
    }
  }

  function validateIntent(): boolean {
    const numericAmount = Number(amount);
    if (!providerCode || !providers.some((provider) => provider.providerCode === providerCode)) {
      setError("Select an available payout provider.");
      return false;
    }
    if (!selectedAccount) {
      setError("Select an active, approved and verified payout bank account.");
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
    if (numericAmount > aepsBalance) {
      setError("Payout amount cannot exceed your available AEPS wallet balance.");
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
    setReviewing(true);
  }

  async function confirm() {
    if (!accessToken || !allowed || submitting || !coordinates || !validateIntent()) return;
    setSubmitting(true);
    setError("");
    idempotencyKey.current ||= createIdempotencyKey("payout");
    try {
      const settlement = await payoutApi.createSettlement(
        accessToken,
        providerCode,
        {
          bankAccountId,
          amount: Number(amount),
          paymentMode,
          ...coordinates,
        },
        idempotencyKey.current,
      );
      setResult(settlement);
      setReviewing(false);
      setAmount("");
      idempotencyKey.current = null;
      const refreshed = await operationsApi.balances(accessToken).catch(() => null);
      if (refreshed) setBalances(refreshed);
    } catch (requestError) {
      // Keep the same idempotency key. A retry after a timeout cannot create a
      // second settlement for the same intent.
      setError(payoutMessage(requestError));
      setReviewing(false);
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
          <span>{error}</span>
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
                      ? "The payout failed. Any reserved wallet amount follows the backend release flow."
                      : "The payout is still being processed. Do not create another payout for the same transfer."}
                </p>
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
              ["Total AEPS debit", inr.format(Number(result.totalWalletDebit))],
              ["Mode", result.paymentMode],
              ["Bank account", `•••• ${result.bankAccount.last4}`],
              ["Wallet state", result.walletState.replaceAll("_", " ")],
              ["Provider", result.providerCode],
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
              <h2 className="text-xl font-black text-secondary">AEPS payout to bank</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Settle AEPS wallet funds into your own approved payout bank account through an
                available provider.
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

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-muted p-4">
            <p className="text-xs font-black uppercase text-muted-foreground">AEPS available</p>
            <p className="mt-2 text-2xl font-black text-secondary">
              {loading ? "—" : inr.format(aepsBalance)}
            </p>
          </div>
          <div className="rounded-2xl bg-muted p-4">
            <p className="text-xs font-black uppercase text-muted-foreground">Eligible banks</p>
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

        {!loading && allowed && eligibleAccounts.length === 0 ? (
          <div className="mt-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <Building2 className="shrink-0" size={19} />
            <p>
              No payout-ready bank account is available. The account must include the PAYOUT purpose
              and have ACTIVE, admin-approved, bank-verified and ownership-verified status.
            </p>
          </div>
        ) : null}

        <form onSubmit={review} className="mt-6 grid gap-5 md:grid-cols-2">
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
              {providers.map((provider) => (
                <option key={provider.providerCode} value={provider.providerCode}>
                  {provider.providerName}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-bold text-secondary">
            Payout bank account
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
              <option value="">Select verified bank</option>
              {eligibleAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.bankName} •••• {account.accountNumberLast4} ({account.accountType})
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-bold text-secondary">
            Amount (minimum ₹100)
            <input
              required
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
            debited from your AEPS wallet. The exact surcharge and total debit are returned before
            the result is displayed.
          </div>

          <button
            disabled={
              !allowed ||
              loading ||
              providers.length === 0 ||
              eligibleAccounts.length === 0 ||
              submitting
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50 md:col-span-2"
          >
            <ShieldCheck size={18} /> Review payout
          </button>
        </form>
      </section>

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
                onClick={() => setReviewing(false)}
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
                ["From", "AEPS wallet"],
                ["To", `${selectedAccount.bankName} •••• ${selectedAccount.accountNumberLast4}`],
                ["Mode", paymentMode],
                ["Provider", selectedProvider.providerName],
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

            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
              The backend will calculate the active surcharge, reserve the total AEPS debit and
              submit this payout immediately. Verify the bank and amount carefully.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setReviewing(false)}
                disabled={submitting}
                className="rounded-xl border border-border py-3 text-sm font-bold text-secondary"
              >
                Edit details
              </button>
              <button
                type="button"
                onClick={() => void confirm()}
                disabled={submitting}
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
