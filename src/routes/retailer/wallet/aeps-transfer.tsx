import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRightLeft, CheckCircle2, CircleAlert, LoaderCircle } from "lucide-react";
import { ActionPermissionNotice } from "@/components/action-permission-notice";
import { BusinessPage } from "@/components/business-page";
import { useEffectiveAccess } from "@/hooks/use-effective-access";
import { getSession } from "@/lib/auth-api";
import {
  newTransferIdempotencyKey,
  operationsApi,
  operationsMessage,
  type AepsToMainTransferResult,
  type WalletBalances,
} from "@/lib/operations-api";
import { credentialsPending, resolveWorkspaceRole, signedInHome } from "@/lib/role-hierarchy";
import { UI_PERMISSION } from "@/lib/ui-permissions";

export const Route = createFileRoute("/retailer/wallet/aeps-transfer")({
  head: () => ({ meta: [{ title: "AEPS to MAIN — Retailer | UMOBIPAY" }] }),
  component: RetailerAepsToMainPage,
});

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
});

function RetailerAepsToMainPage() {
  const navigate = useNavigate();
  const session = getSession();
  const { can } = useEffectiveAccess();
  const allowed = can(UI_PERMISSION.WALLET_AEPS_TO_MAIN_TRANSFER, ["RETAILER"]);
  const [balances, setBalances] = useState<WalletBalances | null>(null);
  const [amount, setAmount] = useState("");
  const [tpin, setTpin] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [result, setResult] = useState<AepsToMainTransferResult | null>(null);
  const keyRef = useRef<string | null>(null);

  async function loadBalances() {
    if (!session) return;
    setBalances(await operationsApi.balances(session.accessToken));
  }

  useEffect(() => {
    if (!session) {
      void navigate({ to: "/login" });
      return;
    }
    if (
      resolveWorkspaceRole(session.identity.role) !== "RETAILER" ||
      credentialsPending(session.identity)
    ) {
      window.location.replace(signedInHome(session));
      return;
    }
    void loadBalances().catch((error) => setNotice({ ok: false, text: operationsMessage(error) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, session?.identity.id]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || busy || !allowed) return;
    const value = Number(amount);
    const aepsBalance = Number(balances?.wallets.aeps ?? 0);
    if (!Number.isFinite(value) || value < 0.01 || !/^\d+(?:\.\d{1,2})?$/.test(amount)) {
      setNotice({ ok: false, text: "Enter a valid amount with maximum 2 decimal places." });
      return;
    }
    if (value > aepsBalance) {
      setNotice({ ok: false, text: "Insufficient AEPS wallet balance." });
      return;
    }
    if (!/^\d{4,6}$/.test(tpin)) {
      setNotice({ ok: false, text: "Enter your 4 to 6 digit financial TPIN." });
      return;
    }

    setBusy(true);
    setNotice(null);
    keyRef.current ||= newTransferIdempotencyKey();
    try {
      const response = await operationsApi.aepsToMain(
        session.accessToken,
        { amount: value, tpin, description: description.trim() || undefined },
        keyRef.current,
      );
      setResult(response);
      setAmount("");
      setTpin("");
      setDescription("");
      keyRef.current = null;
      setNotice({
        ok: true,
        text: response.duplicate
          ? "This transfer was already completed; no duplicate debit was made."
          : "AEPS balance moved to MAIN wallet successfully.",
      });
      await loadBalances();
    } catch (error) {
      setNotice({ ok: false, text: operationsMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  if (!session) {
    return (
      <div className="grid min-h-screen place-items-center">
        <LoaderCircle className="animate-spin" />
      </div>
    );
  }

  return (
    <BusinessPage
      identity={session.identity}
      active="wallet"
      eyebrow="Wallet service"
      title="AEPS to MAIN transfer"
      description="Move your own available AEPS balance into your MAIN wallet securely."
    >
      {!allowed ? (
        <ActionPermissionNotice
          permission={UI_PERMISSION.WALLET_AEPS_TO_MAIN_TRANSFER}
          title="AEPS to MAIN transfer is not enabled"
        />
      ) : null}

      {notice ? (
        <div
          className={`mb-5 flex gap-3 rounded-2xl border p-4 text-sm font-semibold ${notice.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}
        >
          {notice.ok ? <CheckCircle2 size={19} /> : <CircleAlert size={19} />}
          {notice.text}
        </div>
      ) : null}

      <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-muted p-5">
            <p className="text-xs font-extrabold uppercase text-muted-foreground">AEPS balance</p>
            <p className="mt-2 text-2xl font-black text-secondary">
              {inr.format(Number(balances?.wallets.aeps ?? 0))}
            </p>
          </div>
          <div className="rounded-2xl bg-muted p-5">
            <p className="text-xs font-extrabold uppercase text-muted-foreground">MAIN available</p>
            <p className="mt-2 text-2xl font-black text-secondary">
              {inr.format(Number(balances?.wallets.mainAvailable ?? balances?.wallets.main ?? 0))}
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="mt-6 grid gap-5 md:grid-cols-2">
          <label className="text-sm font-bold text-secondary">
            Amount
            <input
              required
              inputMode="decimal"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value.replace(/[^0-9.]/g, ""));
                setResult(null);
                keyRef.current = null;
              }}
              placeholder="0.00"
              className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary"
            />
          </label>
          <label className="text-sm font-bold text-secondary">
            Financial TPIN
            <input
              required
              type="password"
              inputMode="numeric"
              minLength={4}
              maxLength={6}
              value={tpin}
              onChange={(event) => setTpin(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="4–6 digit TPIN"
              className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary"
            />
          </label>
          <label className="text-sm font-bold text-secondary md:col-span-2">
            Description (optional)
            <input
              maxLength={200}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Reason for transfer"
              className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary"
            />
          </label>
          <button
            disabled={!allowed || busy}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 font-extrabold text-white disabled:opacity-50 md:col-span-2"
          >
            {busy ? (
              <LoaderCircle className="animate-spin" size={18} />
            ) : (
              <ArrowRightLeft size={18} />
            )}
            Transfer to MAIN wallet
          </button>
        </form>

        {result ? (
          <p className="mt-5 break-all rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
            Transfer reference: {result.transferReference}
          </p>
        ) : null}
      </section>
    </BusinessPage>
  );
}
