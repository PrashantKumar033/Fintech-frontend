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
import { AdminLayout, AdminPanel } from "@/components/admin/admin-layout";
import { ActionPermissionNotice } from "@/components/action-permission-notice";
import { ApiError, getSession } from "@/lib/auth-api";
import { useEffectiveAccess } from "@/hooks/use-effective-access";
import { UI_PERMISSION } from "@/lib/ui-permissions";
import { distributorApi } from "@/lib/distributor-api";
import {
  newTransferIdempotencyKey,
  operationsApi,
  operationsMessage,
  type WalletBalances,
  type WalletTransferResult,
} from "@/lib/operations-api";
import { credentialsPending, normalizeRole, signedInHome } from "@/lib/role-hierarchy";

export const Route = createFileRoute("/distributor/wallet/transfer")({
  head: () => ({ meta: [{ title: "Transfer Fund — Distributor | UMOBIPAY" }] }),
  component: DistributorWalletTransferPage,
});

type Notice = { ok: boolean; text: string };

type TransferDraft = {
  receiverLoginId: string;
  amount: number;
};

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

function DistributorWalletTransferPage() {
  const navigate = useNavigate();
  const session = getSession();
  const { can } = useEffectiveAccess();
  const canTransfer = can(UI_PERMISSION.WALLET_TRANSFER, ["DISTRIBUTOR"]);
  const [balances, setBalances] = useState<WalletBalances | null>(null);
  const [receiverLoginId, setReceiverLoginId] = useState("");
  const [amount, setAmount] = useState("");
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [review, setReview] = useState<TransferDraft | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [result, setResult] = useState<WalletTransferResult | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);

  const mainBalance = Number(balances?.wallets.main ?? 0);
  const numericAmount = Number(amount);
  const receiver = receiverLoginId.trim().toUpperCase();
  const selfLoginId = session?.identity.loginId?.trim().toUpperCase() ?? "";

  const amountAfterTransfer = useMemo(() => {
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return mainBalance;
    return Math.max(0, mainBalance - numericAmount);
  }, [mainBalance, numericAmount]);

  async function loadBalance() {
    if (!session) return;
    setLoadingBalance(true);
    try {
      const response = await distributorApi.balances(session.identity.id);
      setBalances(response);
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

    if (normalizeRole(session.identity.role) !== "DISTRIBUTOR") {
      window.location.replace(signedInHome(session));
      return;
    }

    if (credentialsPending(session.identity)) {
      window.location.replace(signedInHome(session));
      return;
    }

    void loadBalance();
    // The authenticated identity is stable for the life of this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, session?.identity.id]);

  function resetTransfer() {
    setReceiverLoginId("");
    setAmount("");
    setReview(null);
    setResult(null);
    setNotice(null);
    idempotencyKeyRef.current = null;
  }

  function validateDraft(): TransferDraft | null {
    if (!receiver) {
      setNotice({ ok: false, text: "Enter the receiver Distributor login ID." });
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

    if (numericAmount > mainBalance) {
      setNotice({
        ok: false,
        text: `Insufficient MAIN wallet balance. Available balance is ${inr.format(mainBalance)}.`,
      });
      return null;
    }

    return { receiverLoginId: receiver, amount: numericAmount };
  }

  function reviewTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    setResult(null);

    const draft = validateDraft();
    if (!draft) return;

    idempotencyKeyRef.current = null;
    setReview(draft);
  }

  async function confirmTransfer() {
    if (!session || !review || submitting) return;
    if (!canTransfer) {
      setNotice({ ok: false, text: `Permission ${UI_PERMISSION.WALLET_TRANSFER} is required.` });
      return;
    }

    setSubmitting(true);
    setNotice(null);

    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = newTransferIdempotencyKey();
    }

    try {
      const response = await operationsApi.transfer(
        session.accessToken,
        {
          receiverLoginId: review.receiverLoginId,
          amount: review.amount,
        },
        idempotencyKeyRef.current,
      );

      setResult(response);
      setReview(null);
      setReceiverLoginId("");
      setAmount("");
      idempotencyKeyRef.current = null;
      setNotice({
        ok: true,
        text: response.duplicate
          ? "This transfer was already completed earlier. No second debit was made."
          : "Transfer completed successfully.",
      });
      await loadBalance();
    } catch (error) {
      setNotice({ ok: false, text: operationsMessage(error) });

      // Keep the same key for ambiguous network/server failures. If the first
      // request actually reached the backend, retrying with the same key cannot
      // create a second peer transfer. Clear it for definite 4xx business errors.
      const shouldReuseKey =
        error instanceof ApiError && (error.status === 0 || error.status >= 500);
      if (!shouldReuseKey) idempotencyKeyRef.current = null;
    } finally {
      setSubmitting(false);
    }
  }

  if (!session) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f3f8f6]">
        <LoaderCircle className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AdminLayout
      active="settlements"
      eyebrow="Wallet & earnings"
      title="Transfer fund"
      description="Send money securely from your MAIN wallet to another active Distributor account."
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
          <AdminPanel>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <WalletCards size={22} />
                </span>
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[.12em] text-muted-foreground">
                    Available MAIN wallet
                  </p>
                  <p className="mt-1 text-3xl font-black text-secondary">
                    {loadingBalance ? "—" : inr.format(mainBalance)}
                  </p>
                </div>
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
          </AdminPanel>

          <AdminPanel>
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <ArrowRightLeft size={20} />
              </span>
              <div>
                <h2 className="text-xl font-black text-secondary">Distributor to Distributor</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Enter the receiver&apos;s Distributor login ID. The backend checks the receiver
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
                    placeholder="Example: DST000123"
                    disabled={!canTransfer || submitting}
                    className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3.5 text-sm font-semibold uppercase outline-none transition placeholder:normal-case placeholder:font-normal focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  <span className="mt-2 block text-xs text-muted-foreground">
                    Only an active Distributor account can receive this transfer.
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

              <div className="mt-5 rounded-2xl bg-muted/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-muted-foreground">
                    Balance after transfer
                  </span>
                  <span className="font-black text-secondary">
                    {loadingBalance ? "—" : inr.format(amountAfterTransfer)}
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
                    <dt className="text-sm text-muted-foreground">To Distributor</dt>
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

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReview(null);
                      idempotencyKeyRef.current = null;
                    }}
                    disabled={!canTransfer || submitting}
                    className="rounded-xl border border-border bg-white px-5 py-3.5 text-sm font-extrabold text-secondary transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Edit details
                  </button>
                  <button
                    type="button"
                    onClick={() => void confirmTransfer()}
                    disabled={!canTransfer || submitting}
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
                        Confirm & transfer
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
          </AdminPanel>
        </div>

        <div className="space-y-6">
          <AdminPanel>
            <div className="flex items-center gap-3">
              <UserRoundCheck className="text-primary" size={21} />
              <h2 className="text-lg font-black text-secondary">Transfer rules</h2>
            </div>
            <ul className="mt-4 space-y-4 text-sm leading-6 text-muted-foreground">
              <li className="flex gap-3">
                <CheckCircle2 className="mt-1 shrink-0 text-emerald-600" size={16} />
                <span>
                  Receiver must have the same{" "}
                  <strong className="text-secondary">DISTRIBUTOR</strong> role.
                </span>
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="mt-1 shrink-0 text-emerald-600" size={16} />
                <span>Both sender and receiver accounts must be active.</span>
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="mt-1 shrink-0 text-emerald-600" size={16} />
                <span>The debit always comes from the MAIN wallet.</span>
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="mt-1 shrink-0 text-emerald-600" size={16} />
                <span>The backend checks balance again before posting the debit.</span>
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="mt-1 shrink-0 text-emerald-600" size={16} />
                <span>
                  Each confirmed request uses an idempotency key to reduce duplicate-transfer risk.
                </span>
              </li>
            </ul>
          </AdminPanel>

          <div className="rounded-2xl bg-secondary p-6 text-white shadow-sm">
            <ShieldCheck size={24} />
            <h3 className="mt-4 text-lg font-black">Backend protected</h3>
            <p className="mt-2 text-sm leading-6 text-white/65">
              The UI does not decide who is eligible. Your backend resolves both accounts, checks
              role and status, prevents self-transfer, checks available balance, and posts the debit
              and credit together.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
