import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Activity,
  BadgeCheck,
  Banknote,
  Building2,
  Bus,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Droplets,
  Fingerprint,
  Flame,
  Fuel,
  Gift,
  Headphones,
  IndianRupee,
  Landmark,
  Lightbulb,
  Plane,
  RefreshCw,
  Shield,
  Smartphone,
  Tv,
  Wallet,
  Wifi,
} from "lucide-react";
import { getSession, type Identity } from "@/lib/auth-api";
import { credentialsPending, signedInHome } from "@/lib/role-hierarchy";
import { operationsApi, operationsMessage, type WalletBalances } from "@/lib/operations-api";
import { BusinessPage } from "@/components/business-page";
import { DashboardFeature, PermissionDashboardGrid } from "@/components/permission-dashboard";
import { usePermissionDashboard, type DashboardFeatureKey } from "@/lib/permission-dashboard";
import { formatWalletBalance } from "@/lib/wallet-balance";

export const Route = createFileRoute("/retailer/dashboard")({
  head: () => ({ meta: [{ title: "Business Dashboard — UMOBIPAY" }] }),
  component: DashboardPage,
});
type DashboardService = readonly [string, typeof Wallet, string?, DashboardFeatureKey?];
type DashboardServiceGroup = {
  title: string;
  eyebrow: string;
  viewAllHref: string;
  services: readonly DashboardService[];
};

const serviceGroups: readonly DashboardServiceGroup[] = [
  {
    title: "Money transfer & payments",
    eyebrow: "DMT / AEPS",
    viewAllHref: "/retailer/wallet",
    services: [
      ["Add Money", Banknote, "/retailer/wallet/requests", "wallet"],
      ["Wallet to Wallet", Wallet, "/retailer/wallet/transfer", "wallet"],
      ["AEPS to MAIN", RefreshCw, "/retailer/wallet/aeps-transfer", "wallet"],
      ["Wallet History", CreditCard, "/retailer/wallet/history", "wallet"],
      ["Transactions", Building2, "/retailer/transactions", "transactions"],
    ],
  },
  {
    title: "Bills & utilities",
    eyebrow: "BBPS",
    viewAllHref: "/services",
    services: [
      ["Electricity", Lightbulb],
      ["Water", Droplets],
      ["Gas", Flame],
      ["LPG Booking", Fuel],
      ["Insurance", Shield],
      ["EMI", IndianRupee],
      ["FASTag", CreditCard],
      ["Loan", Landmark],
    ],
  },
  {
    title: "Aadhaar enabled services",
    eyebrow: "AEPS",
    viewAllHref: "/retailer/aeps",
    services: [
      ["Cash Withdrawal", Fingerprint, "/retailer/aeps?service=cash-withdrawal", "aeps"],
      ["Balance Enquiry", BadgeCheck, "/retailer/aeps?service=balance-enquiry", "aeps"],
      ["Mini Statement", Landmark, "/retailer/aeps?service=mini-statement", "aeps"],
      ["Aadhaar Pay", CircleDollarSign, "/retailer/aeps?service=aadhaar-pay", "aeps"],
      ["Cash Deposit", Banknote, "/retailer/aeps?service=cash-deposit", "aeps"],
    ],
  },
  {
    title: "Recharge & travel",
    eyebrow: "RECHARGE",
    viewAllHref: "/services",
    services: [
      ["Mobile Recharge", Smartphone],
      ["DTH", Tv],
      ["Broadband", Wifi],
      ["Bus Booking", Bus],
      ["Flight Booking", Plane],
    ],
  },
];

function DashboardPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<ReturnType<typeof getSession>>(null);
  useEffect(() => {
    const sync = () => {
      const stored = getSession();
      if (!stored) {
        navigate({ to: "/login" });
        return;
      }
      setSession(stored);
      if (credentialsPending(stored.identity)) window.location.replace(signedInHome(stored));
    };
    sync();
    window.addEventListener("pageshow", sync);
    return () => window.removeEventListener("pageshow", sync);
  }, [navigate]);
  if (!session)
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <RefreshCw className="animate-spin text-primary" />
      </div>
    );
  return (
    <BusinessPage identity={session.identity} active="dashboard" showPageHeader={false}>
      <DashboardHome identity={session.identity} />
    </BusinessPage>
  );
}

function DashboardHome({ identity }: { identity: Identity }) {
  const { canShow } = usePermissionDashboard();
  const walletAllowed = canShow("wallet");
  const transactionsAllowed = canShow("transactions");
  const commissionAllowed = canShow("commission");
  const firstName = identity.fullName?.split(" ")[0] || identity.username;
  const [balances, setBalances] = useState<WalletBalances | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({
    todayTransactions: 0,
    todayVolume: 0,
    monthlyCommission: 0,
  });
  useEffect(() => {
    const activeSession = getSession();
    if (!activeSession) return;

    void Promise.allSettled([
      walletAllowed
        ? operationsApi.balances(activeSession.accessToken)
        : Promise.reject(new Error("Wallet access is not granted.")),
      walletAllowed
        ? operationsApi.balance(activeSession.accessToken, "MAIN")
        : Promise.reject(new Error("Wallet access is not granted.")),
      walletAllowed
        ? operationsApi.balance(activeSession.accessToken, "AEPS")
        : Promise.reject(new Error("Wallet access is not granted.")),
      walletAllowed || commissionAllowed
        ? operationsApi.balance(activeSession.accessToken, "PROFIT")
        : Promise.reject(new Error("Profit wallet access is not granted.")),
      transactionsAllowed
        ? operationsApi.transactions(activeSession.accessToken, { page: 1, limit: 100 })
        : Promise.reject(new Error("Transaction access is not granted.")),
      commissionAllowed
        ? operationsApi.walletTransactions(activeSession.accessToken, { page: 1, limit: 100 })
        : Promise.reject(new Error("Commission access is not granted.")),
    ]).then(
      ([balanceResult, mainResult, aepsResult, profitResult, providerResult, ledgerResult]) => {
        const directBalancesAvailable =
          mainResult.status === "fulfilled" ||
          aepsResult.status === "fulfilled" ||
          profitResult.status === "fulfilled";

        if (balanceResult.status === "fulfilled" || directBalancesAvailable) {
          const aggregate = balanceResult.status === "fulfilled" ? balanceResult.value : null;
          const main =
            mainResult.status === "fulfilled"
              ? Number(mainResult.value)
              : (aggregate?.wallets.main ?? 0);
          const mainHeld = aggregate?.wallets.mainHeld ?? 0;

          setBalances({
            userId: aggregate?.userId ?? identity.id,
            wallets: {
              main,
              mainHeld,
              mainAvailable: aggregate?.wallets.mainAvailable ?? main - mainHeld,
              aeps:
                aepsResult.status === "fulfilled"
                  ? Number(aepsResult.value)
                  : (aggregate?.wallets.aeps ?? 0),
              profit:
                profitResult.status === "fulfilled"
                  ? Number(profitResult.value)
                  : (aggregate?.wallets.profit ?? 0),
            },
          });
          setBalanceError(null);
        } else {
          setBalances(null);
          setBalanceError(operationsMessage(balanceResult.reason));
        }

        const now = new Date();
        const isToday = (value: string) => {
          const date = new Date(value);
          return (
            date.getFullYear() === now.getFullYear() &&
            date.getMonth() === now.getMonth() &&
            date.getDate() === now.getDate()
          );
        };
        const isThisMonth = (value: string) => {
          const date = new Date(value);
          return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
        };
        const todaysProviderTransactions =
          providerResult.status === "fulfilled"
            ? providerResult.value.data.filter((transaction) => isToday(transaction.createdAt))
            : [];
        const monthlyCommission =
          ledgerResult.status === "fulfilled"
            ? ledgerResult.value.data
                .filter(
                  (entry) =>
                    entry.walletType === "PROFIT" &&
                    entry.type === "CREDIT" &&
                    entry.status === "SUCCESS" &&
                    isThisMonth(entry.createdAt),
                )
                .reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
            : 0;

        setMetrics({
          todayTransactions: todaysProviderTransactions.length,
          todayVolume: todaysProviderTransactions
            .filter((transaction) => transaction.status === "SUCCESS")
            .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0),
          monthlyCommission,
        });
      },
    );
  }, [commissionAllowed, identity.id, transactionsAllowed, walletAllowed]);
  const money = (value = 0) => formatWalletBalance(value);
  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <section className="relative overflow-hidden rounded-[1.25rem] bg-secondary p-6 text-secondary-foreground shadow-elegant sm:p-8">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 xl:flex-row xl:items-center">
          <div>
            <p className="text-sm text-white/65">Good to see you again</p>
            <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">Hi, {firstName}!</h1>
            <p className="mt-2 max-w-xl text-sm text-white/65">
              Manage payments, assisted banking and your retailer business from one secure
              workspace.
            </p>
          </div>
          <DashboardFeature allowed={canShow("wallet")}>
            <div className="grid grid-cols-3 gap-3">
              <HeroMetric
                label="Main wallet"
                value={balanceError ? "Unavailable" : money(balances?.wallets.main)}
              />
              <HeroMetric
                label="AEPS wallet"
                value={balanceError ? "Unavailable" : money(balances?.wallets.aeps)}
              />
              <HeroMetric
                label="Profit"
                value={balanceError ? "Unavailable" : money(balances?.wallets.profit)}
              />
            </div>
          </DashboardFeature>
        </div>
      </section>
      <PermissionDashboardGrid
        canShow={canShow}
        widgets={[
          {
            key: "wallet-balance",
            feature: "wallet",
            content: (
              <Summary
                icon={Wallet}
                label="Main wallet"
                value={balanceError ? "Unavailable" : money(balances?.wallets.main)}
                note={balanceError || "Live MAIN wallet ledger balance"}
              />
            ),
          },
          {
            key: "today-transactions",
            feature: "transactions",
            content: (
              <Summary
                icon={Activity}
                label="Today's transactions"
                value={String(metrics.todayTransactions)}
                note="AEPS provider operations"
              />
            ),
          },
          {
            key: "today-volume",
            feature: "transactions",
            content: (
              <Summary
                icon={IndianRupee}
                label="Today's volume"
                value={money(metrics.todayVolume)}
                note="Successful AEPS transactions"
              />
            ),
          },
          {
            key: "commission",
            feature: "commission",
            content: (
              <Summary
                icon={Gift}
                label="Monthly commission"
                value={money(metrics.monthlyCommission)}
                note="PROFIT wallet credits"
              />
            ),
          },
        ]}
      />
      {serviceGroups.map((group) => {
        const services = group.services.filter(
          (service) => !service[3] || canShow(service[3] as DashboardFeatureKey),
        );
        return services.length ? (
          <ServiceSection
            key={group.title}
            title={group.title}
            eyebrow={group.eyebrow}
            viewAllHref={group.viewAllHref}
            services={services}
          />
        ) : null;
      })}
      <section className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
            <Headphones size={20} />
          </span>
          <div>
            <h2 className="font-bold text-secondary">Offline service & support</h2>
            <p className="text-sm text-muted-foreground">
              Need assistance with a transaction or service?
            </p>
          </div>
        </div>
        <button className="rounded-xl bg-secondary px-5 py-3 text-sm font-semibold text-secondary-foreground">
          Contact service desk
        </button>
      </section>
    </div>
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
function Summary({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-start justify-between">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-mint text-secondary">
          <Icon size={18} />
        </span>
        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
          LIVE
        </span>
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-extrabold text-secondary">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}
function ServiceSection({
  title,
  eyebrow,
  viewAllHref,
  services,
}: {
  title: string;
  eyebrow: string;
  viewAllHref: string;
  services: readonly DashboardService[];
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-primary">
            {eyebrow}
          </p>
          <h2 className="mt-1 text-lg font-extrabold text-secondary">{title}</h2>
        </div>
        <Link
          to={viewAllHref as never}
          className="hidden items-center gap-1 text-xs font-bold text-secondary hover:text-primary sm:flex"
        >
          View all <ChevronRight size={14} />
        </Link>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-8">
        {services.map(([label, Icon, serviceHref = null]) => {
          const active = Boolean(serviceHref);
          const card = (
            <>
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-card text-secondary shadow-sm transition group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon size={20} />
              </span>
              <span className="mt-3 block text-xs font-bold leading-tight text-secondary">
                {label}
              </span>
              <span
                className={`mt-1 block text-[10px] ${active ? "font-bold text-primary" : "text-muted-foreground"}`}
              >
                {active ? "Open service" : "Coming soon"}
              </span>
            </>
          );
          return active ? (
            <Link
              to={serviceHref as never}
              key={label}
              className="group rounded-2xl border border-border bg-background p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-mint hover:shadow-soft"
            >
              {card}
            </Link>
          ) : (
            <button
              type="button"
              key={label}
              disabled
              className="group rounded-2xl border border-border bg-background p-4 text-left opacity-70"
            >
              {card}
            </button>
          );
        })}
      </div>
    </section>
  );
}
