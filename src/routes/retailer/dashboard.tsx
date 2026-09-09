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
import { operationsApi, type WalletBalances } from "@/lib/operations-api";
import { BusinessPage } from "@/components/business-page";

export const Route = createFileRoute("/retailer/dashboard")({
  head: () => ({ meta: [{ title: "Business Dashboard — UMOBIPAY" }] }),
  component: DashboardPage,
});
const serviceGroups = [
  {
    title: "Money transfer & payments",
    eyebrow: "DMT / AEPS",
    services: [
      ["Wallet to Wallet", Wallet],
      ["Money Transfer", Banknote],
      ["Credit Card Bills", CreditCard],
      ["CMS", Building2],
      ["DMT 2", RefreshCw],
    ],
  },
  {
    title: "Bills & utilities",
    eyebrow: "BBPS",
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
    services: [
      ["AEPS", Fingerprint],
      ["Aadhaar Pay", BadgeCheck],
      ["Settlement", Landmark],
      ["Cash Deposit", Banknote],
      ["Settlement 2", CircleDollarSign],
    ],
  },
  {
    title: "Recharge & travel",
    eyebrow: "RECHARGE",
    services: [
      ["Mobile Recharge", Smartphone],
      ["DTH", Tv],
      ["Broadband", Wifi],
      ["Bus Booking", Bus],
      ["Flight Booking", Plane],
    ],
  },
] as const;

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
    <BusinessPage
      identity={session.identity}
      active="dashboard"
      showPageHeader={false}
    >
      <DashboardHome identity={session.identity} />
    </BusinessPage>
  );
}

function DashboardHome({ identity }: { identity: Identity }) {
  const firstName = identity.fullName?.split(" ")[0] || identity.username;
  const [balances, setBalances] = useState<WalletBalances | null>(null);
  useEffect(() => {
    const activeSession = getSession();
    if (activeSession)
      void operationsApi
        .balances(activeSession.accessToken, identity.id)
        .then(setBalances)
        .catch(() => setBalances(null));
  }, [identity.id]);
  const money = (value = 0) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);
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
          <div className="grid grid-cols-3 gap-3">
            <HeroMetric label="Main wallet" value={money(balances?.wallets.main)} />
            <HeroMetric label="AEPS wallet" value={money(balances?.wallets.aeps)} />
            <HeroMetric label="Profit" value={money(balances?.wallets.profit)} />
          </div>
        </div>
      </section>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Summary
          icon={Wallet}
          label="Available balance"
          value={money(balances?.wallets.main)}
          note="Live main wallet balance"
        />
        <Summary icon={Activity} label="Today's transactions" value="0" note="No activity yet" />
        <Summary icon={IndianRupee} label="Today's volume" value="₹0.00" note="All services" />
        <Summary icon={Gift} label="Monthly commission" value="₹0.00" note="Current month" />
      </div>
      {serviceGroups.map((group) => (
        <ServiceSection
          key={group.title}
          title={group.title}
          eyebrow={group.eyebrow}
          services={group.services}
        />
      ))}
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
  services,
}: {
  title: string;
  eyebrow: string;
  services: readonly (readonly [string, typeof Wallet])[];
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
        <button className="hidden items-center gap-1 text-xs font-bold text-secondary sm:flex">
          View all <ChevronRight size={14} />
        </button>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-8">
        {services.map(([label, Icon]) => {
          const active = label === "AEPS" || label === "Aadhaar Pay" || label === "Cash Deposit";
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
              to="/retailer/aeps"
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
