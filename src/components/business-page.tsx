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
  Menu,
  Receipt,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import logo from "@/assets/logo.png";
import { logout, type Identity } from "@/lib/auth-api";
import { useEffectiveAccess } from "@/hooks/use-effective-access";
import { PermissionBoundary } from "@/components/permission-boundary";
import { canAccessUiArea, type UiArea } from "@/lib/ui-permissions";
import { useServiceReadiness } from "@/lib/service-readiness";
import { credentialsPending } from "@/lib/role-hierarchy";
import { SectionTabs, type SectionTab } from "@/components/section-tabs";

const retailerSectionTabs: Partial<
  Record<"aeps" | "transactions" | "wallet" | "reports" | "settings", SectionTab[]>
> = {
  aeps: [
    { label: "AEPS Services", href: "/retailer/aeps" },
    { label: "Cash Withdrawal", href: "/retailer/aeps?service=cash-withdrawal" },
    { label: "Balance Enquiry", href: "/retailer/aeps?service=balance-enquiry" },
    { label: "Mini Statement", href: "/retailer/aeps?service=mini-statement" },
    { label: "Transaction Status", href: "/retailer/transactions" },
  ],
  transactions: [
    { label: "All Transactions", href: "/retailer/transactions" },
    { label: "Successful", href: "/retailer/transactions?status=SUCCESS" },
    { label: "Pending", href: "/retailer/transactions?status=PENDING" },
    { label: "Failed", href: "/retailer/transactions?status=FAILED" },
  ],
  wallet: [
    { label: "Wallet Balance", href: "/retailer/wallet" },
    { label: "Transfer Fund", href: "/retailer/wallet/transfer" },
  ],
  reports: [
    { label: "Account Activity", href: "/activity" },
    { label: "AEPS Report", href: "/activity?view=aeps" },
    { label: "Wallet Report", href: "/activity?view=wallet" },
    { label: "Commission Report", href: "/activity?view=commission" },
  ],
  settings: [
    { label: "Personal Details", href: "/retailer/settings?tab=profile" },
    { label: "Login & Security", href: "/retailer/settings?tab=security" },
    { label: "Preferences", href: "/retailer/settings?tab=preferences" },
  ],
};

export function BusinessPage({
  identity,
  active,
  eyebrow,
  title,
  description,
  showPageHeader = true,
  onSettingsClick,
  children,
}: {
  identity: Identity;
  active:
    "dashboard" | "bank" | "kyc" | "aeps" | "wallet" | "transactions" | "reports" | "settings";
  eyebrow?: string;
  title?: string;
  description?: string;
  showPageHeader?: boolean;
  onSettingsClick?: () => void;
  children: ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const securityLocked = credentialsPending(identity);
  // The KYC page owns its profile request. Avoid asking for the same missing
  // singleton from the sidebar while that screen is already loading it.
  const readiness = useServiceReadiness(active !== "kyc");
  const { access } = useEffectiveAccess();
  useEffect(() => {
    if (securityLocked && active !== "settings") window.location.replace("/retailer/settings");
  }, [active, securityLocked]);
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileMenuOpen]);
  const nav: Array<{
    key: string;
    label: string;
    to?:
      | "/retailer/dashboard"
      | "/retailer/kyc"
      | "/retailer/bank"
      | "/retailer/aeps"
      | "/retailer/wallet"
      | "/retailer/transactions"
      | "/retailer/settings"
      | "/activity";
    icon: LucideIcon;
    locked: boolean;
    area?: UiArea;
    status?: string;
  }> = [
    {
      key: "dashboard",
      label: "Dashboard",
      to: "/retailer/dashboard",
      icon: LayoutDashboard,
      locked: false,
      area: "dashboard",
    },
    {
      key: "kyc",
      label: "KYC verification",
      to: "/retailer/kyc",
      icon: ShieldCheck,
      locked: false,
      area: "kyc",
      status: readiness.data?.kycStatus?.replaceAll("_", " "),
    },
    {
      key: "bank",
      label: "Bank accounts",
      to: "/retailer/bank",
      icon: Landmark,
      locked: false,
      area: "banking",
      status: readiness.data?.hasVerifiedBank ? "VERIFIED" : undefined,
    },
    {
      key: "aeps",
      label: "AEPS",
      to: "/retailer/aeps",
      icon: Fingerprint,
      locked: !readiness.data?.aepsUnlocked,
      area: "aeps",
    },
    { key: "members", label: "Member management", icon: Users, locked: true, area: "members" },
    {
      key: "wallet",
      label: "Wallet & transfer",
      to: "/retailer/wallet",
      icon: Wallet,
      locked: false,
      area: "wallet",
    },
    {
      key: "transactions",
      label: "Transactions",
      to: "/retailer/transactions",
      icon: Receipt,
      locked: false,
      area: "transactions",
    },
    {
      key: "reports",
      label: "Account activity",
      to: "/activity",
      icon: FileBarChart,
      locked: false,
      area: "reports",
    },
    {
      key: "commission",
      label: "Commission",
      icon: CircleDollarSign,
      locked: true,
      area: "commissions",
    },
    {
      key: "settings",
      label: "Settings",
      to: "/retailer/settings",
      icon: Settings,
      locked: false,
      area: "settings",
    },
  ];
  async function signOut() {
    setMobileMenuOpen(false);
    await logout();
    window.location.assign("/login");
  }
  return (
    <div className="min-h-screen bg-[#f5f8f8] text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-card/95 backdrop-blur-xl">
        <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-background text-secondary lg:hidden"
            aria-label="Open navigation menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="retailer-navigation"
          >
            <Menu size={19} />
          </button>
          <Link to="/retailer/dashboard">
            <img src={logo} className="h-9" alt="UMOBIPAY" />
          </Link>
          <div className="ml-auto flex items-center gap-2">
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
      </header>
      <div className="flex">
        {mobileMenuOpen && (
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-40 bg-secondary/45 backdrop-blur-[2px] lg:hidden"
          />
        )}
        <aside
          id="retailer-navigation"
          className={`fixed inset-y-0 left-0 z-50 flex w-[min(18rem,86vw)] shrink-0 flex-col border-r border-border bg-card p-4 shadow-2xl transition-transform duration-200 lg:sticky lg:top-16 lg:z-20 lg:h-[calc(100vh-4rem)] lg:w-72 lg:translate-x-0 lg:shadow-none ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="mb-4 flex items-center justify-between px-1 lg:hidden">
            <img src={logo} className="h-8" alt="UMOBIPAY" />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="grid h-9 w-9 place-items-center rounded-xl border border-border text-secondary"
              aria-label="Close navigation menu"
            >
              <X size={18} />
            </button>
          </div>
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
            {nav.map(({ key, label, icon: Icon, locked, status, to, area }) => {
              const permissionDenied = area
                ? !canAccessUiArea(area, { role: identity.role, access })
                : false;
              const itemLocked =
                (securityLocked && key !== "settings") || locked || permissionDenied;
              return key === "settings" && onSettingsClick ? (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    onSettingsClick();
                    setMobileMenuOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active === key ? "bg-primary text-white shadow-sm" : "text-secondary hover:bg-mint"}`}
                >
                  <Icon size={17} />
                  <span>{label}</span>
                </button>
              ) : itemLocked ? (
                <div
                  key={key}
                  title={
                    permissionDenied
                      ? "Your active packages do not grant this section"
                      : key === "aeps"
                        ? "KYC approval and verified bank account required"
                        : securityLocked
                          ? "Change temporary password and MPIN in Settings to unlock"
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
                  onClick={() => setMobileMenuOpen(false)}
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
              );
            })}
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
            {showPageHeader && (
              <div className="mb-7">
                <div className="mb-4 flex gap-2 overflow-x-auto lg:hidden">
                  <Link
                    to="/retailer/kyc"
                    className={`min-w-max rounded-xl px-4 py-2 text-xs font-bold ${active === "kyc" ? "bg-secondary text-white" : "bg-card text-secondary"}`}
                  >
                    KYC
                  </Link>
                  <Link
                    to="/retailer/bank"
                    className={`min-w-max rounded-xl px-4 py-2 text-xs font-bold ${active === "bank" ? "bg-secondary text-white" : "bg-card text-secondary"}`}
                  >
                    Bank Accounts
                  </Link>
                  <Link
                    to="/retailer/wallet"
                    className={`min-w-max rounded-xl px-4 py-2 text-xs font-bold ${active === "wallet" ? "bg-secondary text-white" : "bg-card text-secondary"}`}
                  >
                    Wallet
                  </Link>
                  <Link
                    to="/retailer/transactions"
                    className={`min-w-max rounded-xl px-4 py-2 text-xs font-bold ${active === "transactions" ? "bg-secondary text-white" : "bg-card text-secondary"}`}
                  >
                    Transactions
                  </Link>
                  {readiness.data?.aepsUnlocked ? (
                    <Link
                      to="/retailer/aeps"
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
            )}
            {showPageHeader && (
              <SectionTabs
                tabs={retailerSectionTabs[active as keyof typeof retailerSectionTabs] || []}
              />
            )}
            <PermissionBoundary
              area={
                (active === "bank"
                  ? "banking"
                  : active === "transactions"
                    ? "transactions"
                    : active === "reports"
                      ? "reports"
                      : active) as UiArea
              }
              role={identity.role}
              access={access}
            >
              {children}
            </PermissionBoundary>
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
