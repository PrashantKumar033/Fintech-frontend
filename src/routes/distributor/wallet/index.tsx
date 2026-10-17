import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRightLeft,
  Fingerprint,
  Gift,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { AdminLayout, AdminPanel } from "@/components/admin/admin-layout";
import { getSession } from "@/lib/auth-api";
import { distributorApi } from "@/lib/distributor-api";
import { operationsMessage, type WalletBalances } from "@/lib/operations-api";
import { credentialsPending, resolveWorkspaceRole, signedInHome } from "@/lib/role-hierarchy";
import { formatWalletBalance, isNegativeWalletBalance } from "@/lib/wallet-balance";

export const Route = createFileRoute("/distributor/wallet/")({
  head: () => ({ meta: [{ title: "Wallet — Distributor | UMOBIPAY" }] }),
  component: DistributorWalletPage,
});

function DistributorWalletPage() {
  const navigate = useNavigate();
  const session = getSession();
  const [data, setData] = useState<WalletBalances | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadBalances() {
    if (!session) return;
    setLoading(true);
    setError("");
    try {
      setData(await distributorApi.balances(session.identity.id));
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

    if (resolveWorkspaceRole(session.identity.role) !== "DISTRIBUTOR") {
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
      <div className="grid min-h-screen place-items-center bg-[#f3f8f6]">
        <LoaderCircle className="animate-spin text-primary" />
      </div>
    );
  }

  const cards = [
    ["Main wallet", data?.wallets.main, WalletCards],
    ["Main available", data?.wallets.mainAvailable ?? data?.wallets.main, WalletCards],
    ["AEPS wallet", data?.wallets.aeps, Fingerprint],
    ["Profit wallet", data?.wallets.profit, Gift],
  ] as const;

  return (
    <AdminLayout
      active="settlements"
      eyebrow="Wallet & earnings"
      title="Distributor wallet"
      description="View your live wallet balances and use the supported Distributor peer-transfer flow."
    >
      {error && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <ShieldCheck className="mt-0.5 shrink-0" size={18} />
          <p className="font-semibold leading-6">{error}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, Icon]) => {
          const negative = isNegativeWalletBalance(value);
          return (
            <AdminPanel
              key={label}
              className={negative ? "border-red-200 bg-red-50/60" : undefined}
            >
              <div className="flex items-start justify-between gap-4">
                <span
                  className={`grid h-11 w-11 place-items-center rounded-xl ${negative ? "bg-red-100 text-red-700" : "bg-primary/10 text-primary"}`}
                >
                  <Icon size={20} />
                </span>
                <button
                  type="button"
                  onClick={() => void loadBalances()}
                  disabled={loading}
                  aria-label={`Refresh ${label}`}
                  className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-white text-muted-foreground transition hover:text-secondary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCw className={loading ? "animate-spin" : ""} size={15} />
                </button>
              </div>
              <p className="mt-5 text-xs font-bold uppercase tracking-[.08em] text-muted-foreground">
                {label}
              </p>
              <p
                className={`mt-1 text-3xl font-black tabular-nums ${negative ? "text-red-700" : "text-secondary"}`}
              >
                {loading ? "—" : formatWalletBalance(value ?? 0)}
              </p>
              {negative && <p className="mt-1 text-xs font-bold text-red-700">Negative balance</p>}
            </AdminPanel>
          );
        })}
      </div>

      <AdminPanel className="mt-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              <ArrowRightLeft size={22} />
            </span>
            <div>
              <h2 className="text-xl font-black text-secondary">Distributor peer transfer</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Send MAIN-wallet funds to another active Distributor. Distributor → Retailer funding
                is not part of the current peer-transfer API.
              </p>
            </div>
          </div>

          <Link
            to="/distributor/wallet/transfer"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-extrabold text-white shadow-md shadow-primary/20 transition hover:brightness-95"
          >
            <ArrowRightLeft size={17} />
            Transfer fund
          </Link>
        </div>
      </AdminPanel>
    </AdminLayout>
  );
}
