import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowRight,
  ArrowRightLeft,
  CheckCircle2,
  CircleAlert,
  IndianRupee,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  UserRoundCheck,
  WalletCards,
} from "lucide-react";
import { BusinessPage } from "@/components/business-page";
import { ActionPermissionNotice } from "@/components/action-permission-notice";
import { getSession } from "@/lib/auth-api";
import { useEffectiveAccess } from "@/hooks/use-effective-access";
import { UI_PERMISSION } from "@/lib/ui-permissions";
import {
  newTransferIdempotencyKey,
  operationsApi,
  operationsMessage,
  type WalletBalances,
  type WalletTransferOtpChallenge,
  type WalletTransferResult,
} from "@/lib/operations-api";
import { credentialsPending, resolveWorkspaceRole, signedInHome } from "@/lib/role-hierarchy";

export const Route = createFileRoute("/retailer/wallet/transfer")({
  head: () => ({ meta: [{ title: "Transfer Fund — Retailer | UMOBIPAY" }] }),
  component: RetailerWalletTransferPage,
});

type Notice = { ok: boolean; text: string };
type TransferDraft = { receiverLoginId: string; amount: number };

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
});

function normaliseAmountInput(value: string): string {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) return cleaned.replace(/^0+(?=\d)/, "");

  const integer = cleaned.slice(0, firstDot).replace(/^0+(?=\d)/, "") || "0";
  const decimals = cleaned
    .slice(firstDot + 1)
    .replace(/\./g, "")
    .slice(0, 2);
  return `${integer}.${decimals}`;
}

function RetailerWalletTransferPage() {
  const navigate = useNavigate();
  const session = getSession();
  const { can } = useEffectiveAccess();
  const canTransfer = can(UI_PERMISSION.WALLET_TRANSFER, ["RETAILER"]);
  const [balances, setBalances] = useState<WalletBalances | null>(null);
  const [receiverLoginId, setReceiverLoginId] = useState("");
  const [amount, setAmount] = useState("");
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [review, setReview] = useState<TransferDraft | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [result, setResult] = useState<WalletTransferResult | null>(null);
  const [challenge, setChallenge] = useState<WalletTransferOtpChallenge | null>(null);
  const [otp, setOtp] = useState("");
  const idempotencyKeyRef = useRef<string | null>(null);

  const mainBalance = Number(balances?.wallets.main ?? 0);
  const mainAvailableBalance = Number(balances?.wallets.mainAvailable ?? mainBalance);
  const numericAmount = Number(amount);
  const receiver = receiverLoginId.trim().toUpperCase();
  const selfLoginId = session?.identity.loginId?.trim().toUpperCase() ?? "";

  const balancesAfterTransfer = useMemo(() => {
    const debit = Number.isFinite(numericAmount) && numericAmount > 0 ? numericAmount : 0;
    return {
      main: mainBalance - debit,
      available: mainAvailableBalance - debit,
    };
  }, [mainAvailableBalance, mainBalance, numericAmount]);

  async function loadBalance() {
    if (!session) return;
    setLoadingBalance(true);
    try {
      setBalances(await operationsApi.balances(session.accessToken, session.identity.id));
    } catch (error) {
      setNotice({ ok: false, text: operationsMessage(error) });
    } finally {
      setLoadingBalance(false);
    }
  }

  useEffect(() => {
    if (!session) {
      void navigate({ to: "/login" });
      return;
    }

    if (resolveWorkspaceRole(session.identity.role) !== "RETAILER") {
      window.location.replace(signedInHome(session));
      return;
    }

    if (credentialsPending(session.identity)) {
      window.location.replace(signedInHome(session));
      return;
    }

    void loadBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, session?.identity.id]);

  function resetTransfer() {
    setReceiverLoginId("");
    setAmount("");
    setReview(null);
    setResult(null);
    setChallenge(null);
    setOtp("");
    setNotice(null);
    idempotencyKeyRef.current = null;
  }

  function validateDraft(): TransferDraft | null {
    if (!receiver) {
      setNotice({ ok: false, text: "Enter the receiver Retailer login ID." });
      return null;
    }

    if (receiver.length < 3 || receiver.length > 50) {
      setNotice({ ok: false, text: "Receiver login ID must be between 3 and 50 characters." });
      return null;
    }

    if (receiver === selfLoginId) {
      setNotice({ ok: false, text: "You cannot transfer money to your own wallet." });
      return null;
    }

    if (!amount.trim() || !Number.isFinite(numericAmount) || numericAmount < 0.01) {
      setNotice({ ok: false, text: "Enter a valid amount of at least ₹0.01." });
      return null;
    }

    if (!/^\d+(?:\.\d{1,2})?$/.test(amount)) {
      setNotice({ ok: false, text: "Amount can have a maximum of 2 decimal places." });
      return null;
    }

    if (numericAmount > mainAvailableBalance) {
      setNotice({
        ok: false,
        text: `Insufficient MAIN wallet balance. Available balance is ${inr.format(mainAvailableBalance)}.`,
      });
      return null;
    }

    return { receiverLoginId: receiver, amount: numericAmount };
  }

  function reviewTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    setResult(null);
    setChallenge(null);
    setOtp("");
    const draft = validateDraft();
    if (!draft) return;
    idempotencyKeyRef.current = null;
    setReview(draft);
  }

  async function requestTransferOtp(resend = false) {
    if (!session || !review || submitting) return;
    if (!canTransfer) {
      setNotice({ ok: false, text: `Permission ${UI_PERMISSION.WALLET_TRANSFER} is required.` });
      return;
    }

    setSubmitting(true);
    setNotice(null);

    if (resend) {
      idempotencyKeyRef.current = newTransferIdempotencyKey();
      setChallenge(null);
      setOtp("");
    } else if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = newTransferIdempotencyKey();
    }

    try {
      const response = await operationsApi.requestTransferOtp(
        session.accessToken,
        { receiverLoginId: review.receiverLoginId, amount: review.amount },
        idempotencyKeyRef.current,
      );
      setChallenge(response);
      setOtp(response.devOtp || "");
      setNotice({
        ok: true,
        text: `OTP sent to ${response.phoneNumber}. Verify it to complete the transfer.`,
      });
    } catch (error) {
      setNotice({ ok: false, text: operationsMessage(error) });
      idempotencyKeyRef.current = null;
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmTransfer() {
    if (!session || !challenge || !/^\d{6}$/.test(otp) || submitting) return;
    setSubmitting(true);
    setNotice(null);
    try {
      const response = await operationsApi.confirmTransferOtp(
        session.accessToken,
        challenge.challengeId,
        otp,
      );
      setResult(response);
      setReview(null);
      setChallenge(null);
      setOtp("");
      setReceiverLoginId("");
      setAmount("");
      idempotencyKeyRef.current = null;
      setNotice({ ok: true, text: "Transfer completed successfully." });
      await loadBalance();
    } catch (error) {
      setNotice({ ok: false, text: operationsMessage(error) });
    } finally {
      setSubmitting(false);
    }
  }

  if (!session) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f5f8f8]">
        <LoaderCircle className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <BusinessPage
      identity={session.identity}
      active="wallet"
      eyebrow="Wallet service"
      title="Transfer fund"
      description="Send money securely from your MAIN wallet to another active Retailer account."
    >
      {!canTransfer && (
        <div className="mb-5">
          <ActionPermissionNotice
            permission={UI_PERMISSION.WALLET_TRANSFER}
            title="Wallet transfer is not enabled"
          />
        </div>
      )}
      {notice && (
        <div
          role="status"
          className={`mb-5 flex items-start gap-3 rounded-2xl border p-4 text-sm ${
            notice.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {notice.ok ? (
            <CheckCircle2 className="mt-0.5 shrink-0" size={19} />
          ) : (
            <CircleAlert className="mt-0.5 shrink-0" size={19} />
          )}
          <p className="font-semibold leading-6">{notice.text}</p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                {[
                  ["Main wallet", mainBalance],
                  ["Main available", mainAvailableBalance],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center gap-3 rounded-2xl bg-muted/70 p-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <WalletCards size={20} />
                    </span>
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-[.1em] text-muted-foreground">
                        {label}
                      </p>
                      <p className="mt-1 text-2xl font-black text-secondary">
                        {loadingBalance ? "—" : inr.format(Number(value))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => void loadBalance()}
                disabled={!canTransfer || loadingBalance || submitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-extrabold text-secondary transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw className={loadingBalance ? "animate-spin" : ""} size={16} />
                Refresh balance
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <ArrowRightLeft size={20} />
              </span>
              <div>
                <h2 className="text-xl font-black text-secondary">Retailer to Retailer</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Enter the receiver&apos;s Retailer login ID. Your backend validates the receiver
                  role and account status before any debit happens.
                </p>
              </div>
            </div>

            <form onSubmit={reviewTransfer} className="mt-6">
              <div className="grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-extrabold uppercase tracking-[.08em] text-muted-foreground">
                    Receiver login ID
                  </span>
                  <input
                    type="text"
                    value={receiverLoginId}
                    onChange={(event) => {
                      setReceiverLoginId(event.target.value.toUpperCase().slice(0, 50));
                      setReview(null);
                      setResult(null);
                    }}
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    minLength={3}
                    maxLength={50}
                    placeholder="Enter Retailer login ID"
                    disabled={!canTransfer || submitting}
                    className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3.5 text-sm font-semibold uppercase outline-none transition placeholder:normal-case placeholder:font-normal focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  <span className="mt-2 block text-xs text-muted-foreground">
                    Only an active Retailer account can receive this transfer.
                  </span>
                </label>

                <label className="block">
                  <span className="text-xs font-extrabold uppercase tracking-[.08em] text-muted-foreground">
                    Amount
                  </span>
                  <div className="relative mt-2">
                    <IndianRupee
                      size={17}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      value={amount}
                      onChange={(event) => {
                        setAmount(normaliseAmountInput(event.target.value));
                        setReview(null);
                        setResult(null);
                      }}
                      placeholder="0.00"
                      disabled={!canTransfer || submitting}
                      className="w-full rounded-xl border border-border bg-background py-3.5 pl-10 pr-4 text-sm font-semibold outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>
                  <span className="mt-2 block text-xs text-muted-foreground">
                    Transfer uses the MAIN wallet only. Minimum amount is ₹0.01.
                  </span>
                </label>
              </div>

              <div className="mt-5 grid gap-3 rounded-2xl bg-muted/70 p-4 sm:grid-cols-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-muted-foreground">Main after transfer</span>
                  <span className="font-black text-secondary">
                    {loadingBalance ? "—" : inr.format(balancesAfterTransfer.main)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-muted-foreground">
                    Available after transfer
                  </span>
                  <span className="font-black text-secondary">
                    {loadingBalance ? "—" : inr.format(balancesAfterTransfer.available)}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={!canTransfer || loadingBalance || submitting}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-extrabold text-white shadow-md shadow-primary/20 transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Review transfer
                <ArrowRight size={17} />
              </button>
            </form>

            {review && (
              <div className="mt-6 rounded-2xl border-2 border-primary/20 bg-primary/[0.035] p-5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 shrink-0 text-primary" size={22} />
                  <div>
                    <h3 className="text-lg font-black text-secondary">Confirm transfer</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Check the details carefully. A successful wallet transfer is posted
                      immediately.
                    </p>
                  </div>
                </div>

                <dl className="mt-5 divide-y divide-border rounded-xl border border-border bg-white px-4">
                  <div className="flex items-center justify-between gap-4 py-3.5">
                    <dt className="text-sm text-muted-foreground">From</dt>
                    <dd className="text-right text-sm font-extrabold text-secondary">
                      {selfLoginId}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-3.5">
                    <dt className="text-sm text-muted-foreground">To Retailer</dt>
                    <dd className="text-right text-sm font-extrabold text-secondary">
                      {review.receiverLoginId}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-3.5">
                    <dt className="text-sm text-muted-foreground">Amount</dt>
                    <dd className="text-right text-base font-black text-secondary">
                      {inr.format(review.amount)}
                    </dd>
                  </div>
                </dl>

                {challenge ? (
                  <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-bold text-amber-900">
                      Enter the 6-digit OTP sent to {challenge.phoneNumber}.
                    </p>
                    {challenge.devOtp ? (
                      <p className="mt-2 text-sm text-amber-900">
                        Development OTP:{" "}
                        <strong className="tracking-[.25em]">{challenge.devOtp}</strong>
                      </p>
                    ) : null}
                    <input
                      value={otp}
                      onChange={(event) =>
                        setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="Enter OTP"
                      className="mt-3 w-full rounded-xl border border-amber-300 bg-white px-4 py-3 text-center text-lg font-black tracking-[.3em] outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => void requestTransferOtp(true)}
                      className="mt-3 w-full rounded-xl border border-amber-400 bg-white px-4 py-2.5 text-sm font-extrabold text-amber-900 disabled:opacity-60"
                    >
                      {submitting ? "Sending OTP..." : "Resend OTP"}
                    </button>
                  </div>
                ) : null}

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReview(null);
                      setChallenge(null);
                      setOtp("");
                      idempotencyKeyRef.current = null;
                    }}
                    disabled={!canTransfer || submitting}
                    className="rounded-xl border border-border bg-white px-5 py-3.5 text-sm font-extrabold text-secondary transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Edit details
                  </button>
                  <button
                    type="button"
                    onClick={() => void (challenge ? confirmTransfer() : requestTransferOtp())}
                    disabled={
                      !canTransfer || submitting || Boolean(challenge && !/^\d{6}$/.test(otp))
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-secondary px-5 py-3.5 text-sm font-extrabold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <LoaderCircle className="animate-spin" size={17} />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={17} />
                        {challenge ? "Verify OTP & transfer" : "Send transfer OTP"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {result && (
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-700" size={22} />
                  <div className="min-w-0">
                    <h3 className="text-lg font-black text-emerald-900">Transfer successful</h3>
                    <p className="mt-1 text-sm text-emerald-800">
                      Reference:{" "}
                      <span className="break-all font-extrabold">{result.transferReference}</span>
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-white/75 p-4">
                    <p className="text-xs font-bold uppercase text-emerald-800/70">Debited</p>
                    <p className="mt-1 text-xl font-black text-emerald-950">
                      {inr.format(Number(result.senderTransaction.amount))}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/75 p-4">
                    <p className="text-xs font-bold uppercase text-emerald-800/70">
                      New MAIN balance
                    </p>
                    <p className="mt-1 text-xl font-black text-emerald-950">
                      {inr.format(Number(result.senderTransaction.closingBalance))}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={resetTransfer}
                  className="mt-4 rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-extrabold text-emerald-900 transition hover:bg-emerald-100"
                >
                  Make another transfer
                </button>
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <div className="flex items-center gap-3">
              <UserRoundCheck className="text-primary" size={21} />
              <h2 className="text-lg font-black text-secondary">Transfer rules</h2>
            </div>
            <ul className="mt-4 space-y-4 text-sm leading-6 text-muted-foreground">
              <li className="flex gap-3">
                <CheckCircle2 className="mt-1 shrink-0 text-emerald-600" size={16} />
                <span>
                  Receiver must have the same <strong className="text-secondary">RETAILER</strong>{" "}
                  role.
                </span>
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="mt-1 shrink-0 text-emerald-600" size={16} />
                <span>Both sender and receiver accounts and roles must be active.</span>
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="mt-1 shrink-0 text-emerald-600" size={16} />
                <span>The debit always comes from the MAIN wallet.</span>
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="mt-1 shrink-0 text-emerald-600" size={16} />
                <span>The backend checks the current balance again before posting the debit.</span>
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="mt-1 shrink-0 text-emerald-600" size={16} />
                <span>
                  Confirmed requests use an idempotency key to reduce duplicate-transfer risk.
                </span>
              </li>
            </ul>
          </section>

          <div className="rounded-2xl bg-secondary p-6 text-white shadow-sm">
            <ShieldCheck size={24} />
            <h3 className="mt-4 text-lg font-black">Backend protected</h3>
            <p className="mt-2 text-sm leading-6 text-white/65">
              Your backend resolves both accounts, blocks self-transfer, checks the same-role rule
              and active status, locks the wallet transaction, checks balance, and posts both debit
              and credit together.
            </p>
          </div>
        </div>
      </div>
    </BusinessPage>
  );
}
