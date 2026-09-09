import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRightLeft,
  Fingerprint,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { BusinessPage } from "@/components/business-page";
import { getSession } from "@/lib/auth-api";
import { operationsApi, operationsMessage, type WalletBalances } from "@/lib/operations-api";
import { credentialsPending, normalizeRole, signedInHome } from "@/lib/role-hierarchy";

export const Route = createFileRoute("/retailer/wallet/")({
  head: () => ({ meta: [{ title: "Wallet — Retailer | UMOBIPAY" }] }),
  component: RetailerWalletPage,
});

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
});

function RetailerWalletPage() {
  const navigate = useNavigate();
  const session = getSession();
  const [balances, setBalances] = useState<WalletBalances | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadBalances() {
    if (!session) return;
    setLoading(true);
    setError("");
    try {
      const [main, aeps, profit] = await Promise.all([
        operationsApi.balance(session.accessToken, "MAIN"),
        operationsApi.balance(session.accessToken, "AEPS"),
        operationsApi.balance(session.accessToken, "PROFIT"),
      ]);
      setBalances({ userId: session.identity.id, wallets: { main, aeps, profit } });
    } catch (requestError) {
      setError(operationsMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!session) {
      void navigate({ to: "/login" });
      return;
    }

    if (normalizeRole(session.identity.role) !== "RETAILER") {
      window.location.replace(signedInHome(session));
      return;
    }

    if (credentialsPending(session.identity)) {
      window.location.replace(signedInHome(session));
      return;
    }

    void loadBalances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, session?.identity.id]);

  if (!session) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f5f8f8]">
        <LoaderCircle className="animate-spin text-primary" />
      </div>
    );
  }

  const cards = [
    ["Main wallet", balances?.wallets.main ?? 0, WalletCards],
    ["AEPS wallet", balances?.wallets.aeps ?? 0, Fingerprint],
    ["Profit wallet", balances?.wallets.profit ?? 0, ShieldCheck],
  ] as const;

  return (
    <BusinessPage
      identity={session.identity}
      active="wallet"
      eyebrow="Wallet service"
      title="Wallet balance"
      description="View your live wallet balances and open the supported Retailer peer-transfer flow."
    >
      {error && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map(([label, value, Icon]) => (
          <section key={label} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-mint text-secondary">
                <Icon size={20} />
              </span>
              <button
                type="button"
                onClick={() => void loadBalances()}
                disabled={loading}
                aria-label={`Refresh ${label}`}
                className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-background text-muted-foreground transition hover:text-secondary disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw className={loading ? "animate-spin" : ""} size={15} />
              </button>
            </div>
            <p className="mt-5 text-xs font-bold uppercase tracking-[.08em] text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 text-3xl font-black text-secondary">
              {loading ? "—" : inr.format(Number(value))}
            </p>
          </section>
        ))}
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              <ArrowRightLeft size={22} />
            </span>
            <div>
              <h2 className="text-xl font-black text-secondary">Retailer peer transfer</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Send MAIN-wallet funds to another active Retailer. Your backend enforces the same-role rule and checks the balance again before debit.
              </p>
            </div>
          </div>

          <Link
            to="/retailer/wallet/transfer"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-extrabold text-white shadow-md shadow-primary/20 transition hover:brightness-95"
          >
            <ArrowRightLeft size={17} />
            Transfer fund
          </Link>
        </div>
      </section>
    </BusinessPage>
  );
}
