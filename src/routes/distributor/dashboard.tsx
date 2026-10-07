import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Activity,
  Banknote,
  BarChart3,
  CreditCard,
  Fingerprint,
  Headphones,
  IndianRupee,
  Landmark,
  Percent,
  RefreshCw,
  ShieldCheck,
  Store,
  UserPlus,
  Wallet,
} from "lucide-react";
import { AdminLayout, AdminPanel } from "@/components/admin/admin-layout";
import { DashboardFeature, PermissionDashboardGrid } from "@/components/permission-dashboard";
import { usePermissionDashboard, type DashboardFeatureKey } from "@/lib/permission-dashboard";
import { getSession } from "@/lib/auth-api";
import { distributorApi, type HierarchyChild } from "@/lib/distributor-api";
import type { ProviderTransactionPage, WalletBalances } from "@/lib/operations-api";

export const Route = createFileRoute("/distributor/dashboard")({ component: DistributorDashboard });

const quickLinkGroups = [
  {
    title: "Retailer network",
    eyebrow: "NETWORK",
    links: [
      ["Add Retailer", UserPlus, "/distributor/retailers/add", "network"],
      ["My Retailers", Store, "/distributor/retailers", "network"],
    ],
  },
  {
    title: "Wallet & funds",
    eyebrow: "WALLET",
    links: [
      ["Fund Requests", Banknote, "/distributor/wallet/requests", "wallet"],
      ["Transfer Funds", Wallet, "/distributor/wallet/transfer", "wallet"],
      ["Wallet History", CreditCard, "/distributor/wallet/history", "wallet"],
    ],
  },
  {
    title: "AEPS monitoring",
    eyebrow: "AEPS",
    links: [
      ["Balance Enquiry", ShieldCheck, "/distributor/aeps/balance-enquiry", "aeps"],
      ["Mini Statement", Landmark, "/distributor/aeps/mini-statement", "aeps"],
      ["Cash Withdrawal", Fingerprint, "/distributor/aeps/cash-withdrawal", "aeps"],
      ["All AEPS Transactions", Activity, "/distributor/aeps/transactions", "transactions"],
    ],
  },
  {
    title: "Business",
    eyebrow: "BUSINESS",
    links: [
      ["Commission", Percent, "/distributor/commission", "commission"],
      ["Reports", BarChart3, "/distributor/reports", "reports"],
      ["Support", Headphones, "/distributor/support", "support"],
    ],
  },
] as const;

export function DistributorDashboard() {
  const { canShow } = usePermissionDashboard();
  const walletAllowed = canShow("wallet");
  const transactionsAllowed = canShow("transactions");
  const networkAllowed = canShow("network");
  const session = getSession();
  const identityId = session?.identity.id;
  const firstName = session?.identity.fullName?.split(" ")[0] || session?.identity.username;
  const [balances, setBalances] = useState<WalletBalances | null>(null);
  const [transactions, setTransactions] = useState<ProviderTransactionPage | null>(null);
  const [retailers, setRetailers] = useState<HierarchyChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    if (!identityId) return;
    setLoading(true);
    setError("");
    const [walletResult, transactionResult, retailerResult] = await Promise.allSettled([
      walletAllowed ? distributorApi.balances(identityId) : Promise.resolve(null),
      transactionsAllowed ? distributorApi.transactions("page=1&limit=50") : Promise.resolve(null),
      networkAllowed ? distributorApi.retailers(identityId) : Promise.resolve(null),
    ]);
    if (walletResult.status === "fulfilled" && walletResult.value) setBalances(walletResult.value);
    if (transactionResult.status === "fulfilled" && transactionResult.value)
      setTransactions(transactionResult.value);
    if (retailerResult.status === "fulfilled" && retailerResult.value)
      setRetailers(Array.isArray(retailerResult.value) ? retailerResult.value : []);

    const requests = [
      [walletAllowed, walletResult],
      [transactionsAllowed, transactionResult],
      [networkAllowed, retailerResult],
    ] as const;
    const enabled = requests.filter(([allowed]) => allowed).length;
    const failed = requests.filter(
      ([allowed, result]) => allowed && result.status === "rejected",
    ).length;
    if (failed)
      setError(
        failed === enabled
          ? "Live distributor summaries are temporarily unavailable. Please retry."
          : `${failed} dashboard service${failed > 1 ? "s are" : " is"} temporarily unavailable; available data is shown below.`,
      );
    setLoading(false);
  }

  useEffect(() => {
    void loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identityId, networkAllowed, transactionsAllowed, walletAllowed]);

  const rows = transactions?.data || [];
  const successful = rows.filter((row) => row.status === "SUCCESS");
  const volume = successful.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const activeRetailers = retailers.filter((r) => r.isActive).length;
  const money = (value = 0) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);

  const cards = [
    [
      "Total retailers",
      loading ? "—" : String(retailers.length),
      loading ? "Loading network…" : `${activeRetailers} active`,
      Store,
      "network",
    ],
    [
      "Transactions",
      loading ? "—" : String(transactions?.total ?? rows.length),
      `${successful.length} successful`,
      Activity,
      "transactions",
    ],
    [
      "Business volume",
      loading ? "—" : money(volume),
      "Loaded successful transactions",
      IndianRupee,
      "transactions",
    ],
    [
      "Wallet balance",
      loading ? "—" : money(balances?.wallets.main),
      `Profit ${money(balances?.wallets.profit)}`,
      Wallet,
      "wallet",
    ],
  ] as const;

  return (
    <AdminLayout
      active="dashboard"
      eyebrow="Distributor network"
      title="Distributor dashboard"
      description="Retailer network, transaction and wallet summaries from available backend services."
    >
      {error && (
        <div className="mb-5 flex items-center justify-between gap-4 rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadDashboard()}
            disabled={loading}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Retry
          </button>
        </div>
      )}

      <section className="relative mb-6 overflow-hidden rounded-[1.25rem] bg-secondary p-6 text-secondary-foreground shadow-elegant sm:p-8">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 xl:flex-row xl:items-center">
          <div>
            <p className="text-sm text-white/65">Good to see you again</p>
            <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">Hi, {firstName}!</h1>
            <p className="mt-2 max-w-xl text-sm text-white/65">
              Manage your retailer network, funds and AEPS activity from one workspace.
            </p>
          </div>
          <DashboardFeature allowed={canShow("wallet")}>
            <div className="grid grid-cols-3 gap-3">
              <HeroMetric
                label="Main wallet"
                value={loading ? "—" : money(balances?.wallets.main)}
              />
              <HeroMetric
                label="AEPS wallet"
                value={loading ? "—" : money(balances?.wallets.aeps)}
              />
              <HeroMetric label="Profit" value={loading ? "—" : money(balances?.wallets.profit)} />
            </div>
          </DashboardFeature>
        </div>
      </section>

      <PermissionDashboardGrid
        canShow={canShow}
        widgets={cards.map(([label, value, detail, Icon, feature]) => ({
          key: label,
          feature: feature as DashboardFeatureKey,
          content: (
            <AdminPanel>
              <Icon className="text-primary" />
              <p className="mt-5 text-xs font-bold uppercase text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-black">{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
            </AdminPanel>
          ),
        }))}
      />

      {quickLinkGroups.map((group) => (
        <QuickLinkSection key={group.title} {...group} canShow={canShow} />
      ))}

      <DashboardFeature allowed={canShow("aeps")}>
        <AdminPanel className="mt-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-black">Recent AEPS activity</h2>
            <button
              type="button"
              onClick={() => void loadDashboard()}
              disabled={loading}
              aria-label="Refresh dashboard"
              className="grid h-10 w-10 cursor-pointer place-items-center rounded-xl border border-border disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                  <th className="p-3">Reference</th>
                  <th className="p-3">Service</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 8).map((row) => (
                  <tr key={row.id} className="border-b border-border/60">
                    <td className="p-3 font-bold">{row.referenceId}</td>
                    <td className="p-3">{row.operation}</td>
                    <td className="p-3">{money(Number(row.amount))}</td>
                    <td className="p-3 font-bold">{row.status}</td>
                    <td className="p-3">{new Date(row.createdAt).toLocaleDateString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && !rows.length && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No transaction records returned yet.
              </p>
            )}
          </div>
        </AdminPanel>
      </DashboardFeature>

      <DashboardFeature allowed={canShow("support")}>
        <section className="mt-6 flex flex-col justify-between gap-4 rounded-2xl border border-border bg-white p-5 shadow-sm sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <Headphones size={20} />
            </span>
            <div>
              <h2 className="font-bold text-secondary">Need help with your network?</h2>
              <p className="text-sm text-muted-foreground">
                Raise a support ticket for retailer or transaction issues.
              </p>
            </div>
          </div>
          <Link
            to="/distributor/support"
            className="rounded-xl bg-secondary px-5 py-3 text-center text-sm font-semibold text-secondary-foreground"
          >
            Contact support
          </Link>
        </section>
      </DashboardFeature>
    </AdminLayout>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-24 rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur">
      <p className="text-[10px] uppercase tracking-wider text-white/55">{label}</p>
      <p className="mt-1 text-lg font-extrabold">{value}</p>
    </div>
  );
}

function QuickLinkSection({
  title,
  eyebrow,
  links,
  canShow,
}: {
  title: string;
  eyebrow: string;
  links: readonly (readonly [string, typeof Wallet, string, DashboardFeatureKey])[];
  canShow: (feature: DashboardFeatureKey) => boolean;
}) {
  const visibleLinks = links.filter(([, , , feature]) => canShow(feature));
  if (!visibleLinks.length) return null;
  return (
    <section className="mt-6 rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
      <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-primary">{eyebrow}</p>
      <h2 className="mt-1 text-lg font-extrabold text-secondary">{title}</h2>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {visibleLinks.map(([label, Icon, href]) => (
          <Link
            key={label}
            to={href as never}
            className="group rounded-2xl border border-border bg-background p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-mint hover:shadow-soft"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-card text-secondary shadow-sm transition group-hover:bg-primary group-hover:text-primary-foreground">
              <Icon size={20} />
            </span>
            <span className="mt-3 block text-xs font-bold leading-tight text-secondary">
              {label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
