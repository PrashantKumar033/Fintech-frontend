import { Link, useLocation } from "@tanstack/react-router";
import { BadgeCheck, Bell, Lock, LogOut, Menu, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import logo from "@/assets/logo.png";
import { logout, type Identity } from "@/lib/auth-api";
import { useEffectiveAccess } from "@/hooks/use-effective-access";
import { PermissionBoundary } from "@/components/permission-boundary";
import { canAccessUiArea, UI_PERMISSION, type UiArea } from "@/lib/ui-permissions";
import { navigationForRole } from "@/lib/app-navigation";
import { useServiceReadiness } from "@/lib/service-readiness";
import { credentialsPending } from "@/lib/role-hierarchy";
import { SectionTabs, type SectionTab } from "@/components/section-tabs";
import { WalletBalanceHeader } from "@/components/wallet-balance-header";

const retailerSectionTabs: Partial<
  Record<"aeps" | "transactions" | "wallet" | "reports" | "commission" | "settings", SectionTab[]>
> = {
  aeps: [
    { label: "AEPS Services", href: "/retailer/aeps", area: "aeps" },
    {
      label: "Cash Withdrawal",
      href: "/retailer/aeps?service=cash-withdrawal",
      permission: UI_PERMISSION.AEPS_CASH_WITHDRAWAL,
    },
    {
      label: "Balance Enquiry",
      href: "/retailer/aeps?service=balance-enquiry",
      permission: UI_PERMISSION.AEPS_BALANCE_ENQUIRY,
    },
    {
      label: "Mini Statement",
      href: "/retailer/aeps?service=mini-statement",
      permission: UI_PERMISSION.AEPS_MINI_STATEMENT,
    },
    {
      label: "Aadhaar Pay",
      href: "/retailer/aeps?service=aadhaar-pay",
      permission: UI_PERMISSION.AEPS_AADHAAR_PAY,
    },
    {
      label: "Cash Deposit",
      href: "/retailer/aeps?service=cash-deposit",
      permission: UI_PERMISSION.AEPS_CASH_DEPOSIT,
    },
    {
      label: "Transaction Status",
      href: "/retailer/transactions",
      permission: UI_PERMISSION.AEPS_TRANSACTION_VIEW,
    },
  ],
  transactions: [
    {
      label: "All Transactions",
      href: "/retailer/transactions",
      permission: UI_PERMISSION.AEPS_TRANSACTION_VIEW,
    },
    {
      label: "Successful",
      href: "/retailer/transactions?status=SUCCESS",
      permission: UI_PERMISSION.AEPS_TRANSACTION_VIEW,
    },
    {
      label: "Pending",
      href: "/retailer/transactions?status=PENDING",
      permission: UI_PERMISSION.AEPS_TRANSACTION_VIEW,
    },
    {
      label: "Failed",
      href: "/retailer/transactions?status=FAILED",
      permission: UI_PERMISSION.AEPS_TRANSACTION_VIEW,
    },
  ],
  wallet: [
    {
      label: "Wallet Balance",
      href: "/retailer/wallet",
      permission: UI_PERMISSION.WALLET_VIEW,
    },
    {
      label: "Add Money",
      href: "/retailer/wallet/requests",
      permission: UI_PERMISSION.WALLET_FUND_REQUEST,
    },
    {
      label: "AEPS to MAIN",
      href: "/retailer/wallet/aeps-transfer",
      permission: UI_PERMISSION.WALLET_AEPS_TO_MAIN_TRANSFER,
    },
    {
      label: "Payout to Bank",
      href: "/retailer/wallet/payout",
      permission: [
        UI_PERMISSION.PAYOUT_SETTLEMENT_CREATE,
        UI_PERMISSION.PAYOUT_SETTLEMENT_VIEW_SELF,
      ],
    },
    {
      label: "Transfer Fund",
      href: "/retailer/wallet/transfer",
      permission: UI_PERMISSION.WALLET_TRANSFER,
    },
    {
      label: "Wallet History",
      href: "/retailer/wallet/history",
      permission: UI_PERMISSION.WALLET_TRANSACTION_VIEW,
    },
  ],
  reports: [
    {
      label: "Financial Report",
      href: "/retailer/reports",
      permission: UI_PERMISSION.WALLET_TRANSACTION_VIEW,
    },
  ],
  commission: [
    { label: "Commission summary", href: "/retailer/commission", area: "earnings" },
    {
      label: "Commission transactions",
      href: "/retailer/transactions",
      permission: UI_PERMISSION.AEPS_TRANSACTION_VIEW,
    },
    { label: "Commission activity", href: "/activity?view=commission" },
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
    | "dashboard"
    | "bank"
    | "kyc"
    | "aeps"
    | "members"
    | "wallet"
    | "transactions"
    | "reports"
    | "activity"
    | "commission"
    | "settings";
  eyebrow?: string;
  title?: string;
  description?: string;
  showPageHeader?: boolean;
  onSettingsClick?: () => void;
  children: ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const securityLocked = credentialsPending(identity);
  const readiness = useServiceReadiness();
  const { access } = useEffectiveAccess();
  const currentHref = useLocation({ select: (location) => location.href });
  const currentUrl = new URL(currentHref, "http://localhost");
  const complianceGateActive =
    !securityLocked &&
    (readiness.isPending ||
      (readiness.isSuccess &&
        readiness.data.complianceStatusAvailable &&
        !readiness.data.complianceSetupComplete));
  const complianceAllowedKeys = new Set(["kycSelf", "bankAccounts", "settings"]);
  const complianceMessage = readiness.data?.kycSubmitted
    ? "Add a bank account to unlock the remaining services."
    : "Submit KYC and add a bank account to unlock the remaining services.";
  const homePath = complianceGateActive
    ? readiness.data?.kycSubmitted
      ? "/retailer/bank"
      : "/retailer/kyc"
    : "/retailer/dashboard";
  const actionPermission = (() => {
    if (currentUrl.pathname === "/retailer/transactions") {
      return UI_PERMISSION.AEPS_TRANSACTION_VIEW;
    }
    if (currentUrl.pathname === "/retailer/reports") {
      return UI_PERMISSION.WALLET_TRANSACTION_VIEW;
    }
    if (currentUrl.pathname === "/retailer/wallet/requests") {
      return UI_PERMISSION.WALLET_FUND_REQUEST;
    }
    if (currentUrl.pathname === "/retailer/wallet/transfer") {
      return UI_PERMISSION.WALLET_TRANSFER;
    }
    if (currentUrl.pathname === "/retailer/wallet/aeps-transfer") {
      return UI_PERMISSION.WALLET_AEPS_TO_MAIN_TRANSFER;
    }
    if (currentUrl.pathname === "/retailer/wallet/payout") {
      return UI_PERMISSION.PAYOUT_SETTLEMENT_CREATE;
    }
    if (currentUrl.pathname === "/retailer/wallet/history") {
      return UI_PERMISSION.WALLET_TRANSACTION_VIEW;
    }
    if (currentUrl.pathname === "/retailer/wallet/holds") {
      return UI_PERMISSION.WALLET_HOLD_VIEW;
    }
    if (currentUrl.pathname === "/retailer/aeps") {
      const servicePermissions: Record<string, string> = {
        "cash-withdrawal": UI_PERMISSION.AEPS_CASH_WITHDRAWAL,
        "balance-enquiry": UI_PERMISSION.AEPS_BALANCE_ENQUIRY,
        "mini-statement": UI_PERMISSION.AEPS_MINI_STATEMENT,
        "aadhaar-pay": UI_PERMISSION.AEPS_AADHAAR_PAY,
        "cash-deposit": UI_PERMISSION.AEPS_CASH_DEPOSIT,
      };
      return servicePermissions[currentUrl.searchParams.get("service") || ""];
    }
    return undefined;
  })();
  useEffect(() => {
    if (securityLocked && active !== "settings") window.location.replace("/retailer/settings");
  }, [active, securityLocked]);
  useEffect(() => {
    if (
      securityLocked ||
      active === "kyc" ||
      active === "bank" ||
      active === "settings" ||
      !readiness.isSuccess ||
      !readiness.data.complianceStatusAvailable ||
      readiness.data.complianceSetupComplete
    )
      return;
    window.location.replace(readiness.data.kycSubmitted ? "/retailer/bank" : "/retailer/kyc");
  }, [active, readiness.data, readiness.isSuccess, securityLocked]);
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
  const nav = navigationForRole("RETAILER").filter((item) =>
    canAccessUiArea(item.area, { role: identity.role, access }),
  );
  const pathnameItem = [...nav]
    .filter(
      (item) => currentUrl.pathname === item.to || currentUrl.pathname.startsWith(`${item.to}/`),
    )
    .sort((left, right) => right.to.length - left.to.length)[0];
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
          <Link to={homePath as never}>
            <img src={logo} className="h-9" alt="UMOBIPAY" />
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden min-w-0 px-1 sm:px-3 lg:block">
              <WalletBalanceHeader identity={identity} />
            </div>
            <button
              type="button"
              onClick={() => setNotificationsOpen((open) => !open)}
              className="relative grid h-10 w-10 place-items-center rounded-xl border border-border bg-background text-secondary"
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
            >
              <Bell size={18} />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
            </button>
            {notificationsOpen && (
              <div className="absolute right-4 top-14 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-4 shadow-xl lg:right-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-extrabold text-secondary">Notifications</p>
                  <button
                    type="button"
                    onClick={() => setNotificationsOpen(false)}
                    className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
                    aria-label="Close notifications"
                  >
                    <X size={15} />
                  </button>
                </div>
                <div className="mt-3 rounded-xl bg-muted/60 p-4 text-center">
                  <Bell size={20} className="mx-auto text-muted-foreground" />
                  <p className="mt-2 text-sm font-bold text-secondary">No new notifications</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Account and transaction alerts will appear here.
                  </p>
                </div>
                <Link
                  to="/retailer/settings"
                  onClick={() => setNotificationsOpen(false)}
                  className="mt-3 flex w-full items-center justify-center rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-secondary hover:bg-muted"
                >
                  Notification preferences
                </Link>
              </div>
            )}
            <Link
              to="/retailer/settings"
              aria-label="Open profile settings"
              className="hidden items-center gap-3 rounded-xl border border-border px-3 py-1.5 transition hover:bg-muted sm:flex"
            >
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-secondary font-bold text-white">
                {identity.fullName?.[0] || "U"}
              </span>
              <div className="max-w-36">
                <p className="truncate text-xs font-bold text-secondary">{identity.fullName}</p>
                <p className="truncate text-[10px] text-muted-foreground">{identity.loginId}</p>
              </div>
            </Link>
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
          {readiness.isSuccess &&
            readiness.data.complianceStatusAvailable &&
            !readiness.data.complianceSetupComplete &&
            !securityLocked && (
              <div className="mb-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <Lock size={14} className="mt-0.5 shrink-0" />
                <span>{complianceMessage}</span>
              </div>
            )}
          <div className="mb-4 lg:hidden">
            <WalletBalanceHeader identity={identity} compact />
          </div>
          <nav className="space-y-1 overflow-y-auto">
            {nav.map(({ key, active: itemActive, label, icon: Icon, to }) => {
              const selected = pathnameItem ? pathnameItem.key === key : active === itemActive;
              const status =
                key === "kycSelf"
                  ? readiness.data?.kycStatus?.replaceAll("_", " ")
                  : key === "bankAccounts" && readiness.data?.hasVerifiedBank
                    ? "VERIFIED"
                    : undefined;
              const itemLocked =
                (securityLocked && key !== "settings") ||
                (complianceGateActive && !complianceAllowedKeys.has(key)) ||
                (key === "aeps" && !readiness.data?.aepsUnlocked);
              return key === "settings" && onSettingsClick ? (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    onSettingsClick();
                    setMobileMenuOpen(false);
                  }}
                  aria-current={selected ? "page" : undefined}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${selected ? "bg-primary text-white shadow-sm" : "text-secondary hover:bg-mint"}`}
                >
                  <Icon size={17} />
                  <span>{label}</span>
                </button>
              ) : itemLocked ? (
                <div
                  key={key}
                  title={
                    key === "aeps"
                      ? "KYC approval and verified bank account required"
                      : complianceGateActive && !complianceAllowedKeys.has(key)
                        ? complianceMessage
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
                  to={to as never}
                  onClick={() => setMobileMenuOpen(false)}
                  aria-current={selected ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${selected ? "bg-primary text-white shadow-sm" : "text-secondary hover:bg-mint"}`}
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
                  {nav
                    .filter((item) =>
                      ["kycSelf", "bankAccounts", "wallet", "transactions", "aeps"].includes(
                        item.key,
                      ),
                    )
                    .map((item) =>
                      (complianceGateActive && !complianceAllowedKeys.has(item.key)) ||
                      (item.key === "aeps" && !readiness.data?.aepsUnlocked) ? (
                        <span
                          key={item.key}
                          title={
                            complianceGateActive && !complianceAllowedKeys.has(item.key)
                              ? complianceMessage
                              : "KYC approval and verified bank account required"
                          }
                          className="flex min-w-max items-center gap-2 rounded-xl bg-muted px-4 py-2 text-xs font-bold text-muted-foreground"
                        >
                          <Lock size={12} /> {item.label}
                        </span>
                      ) : (
                        <Link
                          key={item.key}
                          to={item.to as never}
                          className={`min-w-max rounded-xl px-4 py-2 text-xs font-bold ${active === item.active ? "bg-secondary text-white" : "bg-card text-secondary"}`}
                        >
                          {item.label}
                        </Link>
                      ),
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
                role={identity.role}
                access={access}
              />
            )}
            <PermissionBoundary
              area={
                (active === "bank"
                  ? "bankAccounts"
                  : active === "kyc"
                    ? "kycSelf"
                    : active === "transactions"
                      ? "transactions"
                      : active === "activity"
                        ? "activity"
                        : active === "reports"
                          ? "reports"
                          : active === "commission"
                            ? "earnings"
                            : active) as UiArea
              }
              role={identity.role}
              access={access}
            >
              {actionPermission ? (
                <PermissionBoundary
                  permission={actionPermission}
                  role={identity.role}
                  access={access}
                  fallbackRoles={["RETAILER"]}
                >
                  {children}
                </PermissionBoundary>
              ) : (
                children
              )}
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
