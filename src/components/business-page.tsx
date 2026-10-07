import { Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  Bell,
  CircleDollarSign,
  FileBarChart,
  Fingerprint,
  Landmark,
  LayoutDashboard,
  Lock,
  LogOut,
  Receipt,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import logo from "@/assets/logo.png";
import { logout, type Identity } from "@/lib/auth-api";
import { useServiceReadiness } from "@/lib/service-readiness";
import { WalletBalanceHeader } from "@/components/wallet-balance-header";

export function BusinessPage({
  identity,
  active,
  eyebrow,
  title,
  description,
  children,
}: {
  identity: Identity;
  active: "bank" | "kyc" | "aeps";
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const readiness = useServiceReadiness();
  const nav: Array<{
    key: string;
    label: string;
    to?: "/dashboard" | "/kyc" | "/bank-accounts" | "/aeps";
    icon: LucideIcon;
    locked: boolean;
    status?: string;
  }> = [
    {
      key: "dashboard",
      label: "Dashboard",
      to: "/dashboard",
      icon: LayoutDashboard,
      locked: false,
    },
    {
      key: "kyc",
      label: "KYC verification",
      to: "/kyc",
      icon: ShieldCheck,
      locked: false,
      status: readiness.data?.kycStatus?.replaceAll("_", " "),
    },
    {
      key: "bank",
      label: "Bank accounts",
      to: "/bank-accounts",
      icon: Landmark,
      locked: false,
      status: readiness.data?.hasVerifiedBank ? "VERIFIED" : undefined,
    },
    {
      key: "aeps",
      label: "AEPS",
      to: "/aeps",
      icon: Fingerprint,
      locked: !readiness.data?.aepsUnlocked,
    },
    { key: "members", label: "Member management", icon: Users, locked: true },
    { key: "wallet", label: "Wallet & settlement", icon: Wallet, locked: true },
    { key: "transactions", label: "Transactions", icon: Receipt, locked: true },
    { key: "reports", label: "Reports", icon: FileBarChart, locked: true },
    { key: "commission", label: "Commission", icon: CircleDollarSign, locked: true },
    { key: "settings", label: "Settings", to: "/dashboard", icon: Settings, locked: false },
  ].filter(({ key }) => key !== "reports" || identity.role.trim().toUpperCase() !== "RETAILER");
  async function signOut() {
    await logout();
    window.location.assign("/login");
  }
  return (
    <div className="min-h-screen bg-[#f5f8f8] text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-card/95 backdrop-blur-xl">
        <div className="flex h-16 items-center px-5 lg:px-6">
          <Link to="/dashboard">
            <img src={logo} className="h-9" alt="UMOBIPAY" />
          </Link>
          <div className="ml-auto hidden items-center gap-2 lg:flex">
            <WalletBalanceHeader identity={identity} />
            <button
              className="relative grid h-10 w-10 place-items-center rounded-xl border border-border bg-background text-secondary"
              aria-label="Notifications"
            >
              <Bell size={18} />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
            </button>
            <div className="hidden items-center gap-3 rounded-xl border border-border px-3 py-1.5 sm:flex">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-secondary font-bold text-white">
                {identity.fullName?.[0] || "U"}
              </span>
              <div className="max-w-36">
                <p className="truncate text-xs font-bold text-secondary">{identity.fullName}</p>
                <p className="truncate text-[10px] text-muted-foreground">{identity.loginId}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-border/60 px-5 py-2 lg:hidden">
          <WalletBalanceHeader identity={identity} />
        </div>
      </header>
      <div className="flex">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-72 shrink-0 flex-col border-r border-border bg-card p-4 lg:flex">
          <div className="mb-5 rounded-2xl bg-secondary p-4 text-white">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-lg font-extrabold">
                {identity.fullName?.[0] || "U"}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{identity.fullName}</p>
                <p className="text-xs text-white/60">{identity.role}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3 text-xs text-emerald-300">
              <BadgeCheck size={14} /> {identity.status} account
            </div>
          </div>
          <nav className="space-y-1 overflow-y-auto">
            {nav.map(({ key, label, icon: Icon, locked, status, to }) =>
              locked ? (
                <div
                  key={key}
                  title={
                    key === "aeps"
                      ? "KYC approval and verified bank account required"
                      : "Coming soon"
                  }
                  className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground/55"
                >
                  <Icon size={17} />
                  <span>{label}</span>
                  <Lock size={12} className="ml-auto" />
                </div>
              ) : (
                <Link
                  key={key}
                  to={to!}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active === key ? "bg-primary text-white shadow-sm" : "text-secondary hover:bg-mint"}`}
                >
                  <Icon size={17} />
                  <span>{label}</span>
                  {status && (
                    <span className="ml-auto max-w-20 truncate rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-extrabold text-emerald-700">
                      {status}
                    </span>
                  )}
                </Link>
              ),
            )}
          </nav>
          <button
            onClick={signOut}
            className="mt-auto flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-destructive hover:bg-destructive/10"
          >
            <LogOut size={17} /> Sign out
          </button>
        </aside>
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-[1500px]">
            <div className="mb-7">
              <div className="mb-4 flex gap-2 overflow-x-auto lg:hidden">
                <Link
                  to="/kyc"
                  className={`min-w-max rounded-xl px-4 py-2 text-xs font-bold ${active === "kyc" ? "bg-secondary text-white" : "bg-card text-secondary"}`}
                >
                  KYC
                </Link>
                <Link
                  to="/bank-accounts"
                  className={`min-w-max rounded-xl px-4 py-2 text-xs font-bold ${active === "bank" ? "bg-secondary text-white" : "bg-card text-secondary"}`}
                >
                  Bank Accounts
                </Link>
                {readiness.data?.aepsUnlocked ? (
                  <Link
                    to="/aeps"
                    className={`min-w-max rounded-xl px-4 py-2 text-xs font-bold ${active === "aeps" ? "bg-secondary text-white" : "bg-card text-secondary"}`}
                  >
                    AEPS
                  </Link>
                ) : (
                  <span className="flex min-w-max items-center gap-2 rounded-xl bg-muted px-4 py-2 text-xs font-bold text-muted-foreground">
                    <Lock size={12} /> AEPS
                  </span>
                )}
              </div>
              <p className="text-xs font-extrabold uppercase tracking-[.2em] text-primary">
                {eyebrow}
              </p>
              <h1 className="mt-1 text-3xl font-extrabold text-secondary">{title}</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export function ServiceNotice({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <div
      className={`flex gap-3 rounded-xl p-4 text-sm font-semibold ${ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}
    >
      <BadgeCheck size={18} className="shrink-0" />
      {children}
    </div>
  );
}
