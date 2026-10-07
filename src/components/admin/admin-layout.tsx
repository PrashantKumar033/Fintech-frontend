import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { Bell, Menu } from "lucide-react";
import logo from "@/assets/logo.png";
import { getAdminActor, getAdminSession } from "@/lib/admin-api";
import { getSession } from "@/lib/auth-api";
import { useEffectiveAccess } from "@/hooks/use-effective-access";
import { PermissionBoundary } from "@/components/permission-boundary";
import {
  credentialsPending,
  identityVerificationPending,
  isManagementRole,
  managementBasePath,
  resolveWorkspaceRole,
} from "@/lib/role-hierarchy";
import { navigationForRole } from "@/lib/app-navigation";
import { UI_PERMISSION } from "@/lib/ui-permissions";
import { AdminSidebar, type AdminArea } from "./admin-sidebar";
import { SectionTabs } from "@/components/section-tabs";
import { managementSectionTabs } from "@/lib/management-section-tabs";
import { useServiceReadiness } from "@/lib/service-readiness";
import { WalletBalanceHeader } from "@/components/wallet-balance-header";

// Child admin routes currently own their page metadata and therefore mount the
// shell component independently. Remember a successful client-side guard pass
// so SPA navigation never replaces the whole workspace with a loading screen.
let adminWorkspaceReady = false;

export function AdminLayout({
  active,
  eyebrow,
  title,
  description,
  selfServiceCompliance = false,
  children,
}: {
  active: AdminArea;
  eyebrow?: string;
  title: string;
  description: string;
  selfServiceCompliance?: boolean;
  children: ReactNode;
}) {
  const [ready, setReady] = useState(adminWorkspaceReady);
  const [menu, setMenu] = useState(false);
  const pathname = useLocation({ select: (location) => location.pathname });
  const actor = getAdminActor();
  const identity = actor?.kind === "IDENTITY_ADMIN" ? getSession()?.identity : undefined;
  const { access } = useEffectiveAccess();
  const compliance = useServiceReadiness(
    Boolean(identity && isManagementRole(identity.role) && !credentialsPending(identity)),
  );
  const securityLocked = credentialsPending(identity);
  const complianceGateActive = Boolean(
    identity &&
    !securityLocked &&
    (compliance.isPending ||
      (compliance.isSuccess &&
        compliance.data.complianceStatusAvailable &&
        !compliance.data.complianceSetupComplete)),
  );
  const complianceMessage = compliance.data?.kycSubmitted
    ? "Add a bank account to unlock the remaining services."
    : "Submit KYC and add a bank account to unlock the remaining services.";
  const aepsLocked = Boolean(identity && (!compliance.isSuccess || !compliance.data.aepsUnlocked));

  useEffect(() => {
    const currentActor = getAdminActor();
    if (!currentActor) return window.location.replace("/login");
    if (getAdminSession()?.onboardingRequired) return window.location.replace("/admin/onboarding");
    const identitySession = currentActor.kind === "IDENTITY_ADMIN" ? getSession() : null;
    const base = managementBasePath(identitySession?.identity.role);
    if (base !== "/admin" && window.location.pathname.startsWith("/admin")) {
      return window.location.replace(`${base}${window.location.pathname.slice("/admin".length)}`);
    }
    if (
      identitySession &&
      isManagementRole(identitySession.identity.role) &&
      credentialsPending(identitySession.identity)
    ) {
      if (active !== "settings")
        return window.location.replace(
          identityVerificationPending(identitySession)
            ? `${base}/account-setup`
            : `${base}/settings`,
        );
    }
    const compliancePage =
      window.location.pathname === `${base}/profile` ||
      window.location.pathname.startsWith(`${base}/profile/`) ||
      window.location.pathname === `${base}/settings`;
    if (
      identitySession &&
      isManagementRole(identitySession.identity.role) &&
      compliance.isSuccess &&
      compliance.data.complianceStatusAvailable &&
      !compliance.data.complianceSetupComplete &&
      !compliancePage
    ) {
      return window.location.replace(`${base}/profile`);
    }
    adminWorkspaceReady = true;
    setReady(true);
  }, [active, actor?.kind, compliance.data, compliance.isSuccess]);
  useEffect(() => {
    document.body.style.overflow = menu ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menu]);

  if (!ready)
    return (
      <div className="grid min-h-screen place-items-center bg-[#f3f8f6] text-sm font-bold text-secondary">
        Loading secure workspace...
      </div>
    );

  const navigationRole = resolveWorkspaceRole(identity?.role || actor?.role, access);
  const routeArea = navigationRole
    ? navigationForRole(navigationRole).find((item) => item.active === active)?.area
    : undefined;
  const sectionTabsArea: AdminArea = selfServiceCompliance ? "profile" : active;
  const sectionTabs = managementSectionTabs(identity?.role || actor?.role, sectionTabsArea);
  const routePermission = (() => {
    if (selfServiceCompliance) return undefined;
    if (pathname.endsWith("/wallet/transfer")) return UI_PERMISSION.WALLET_TRANSFER;
    if (pathname.endsWith("/wallet/requests")) return UI_PERMISSION.WALLET_FUND_REQUEST;
    if (pathname.endsWith("/wallet/history")) return UI_PERMISSION.WALLET_TRANSACTION_VIEW;
    if (pathname.endsWith("/wallet/holds")) return UI_PERMISSION.WALLET_HOLD_VIEW;
    if (pathname.endsWith("/wallet/payout")) {
      return [UI_PERMISSION.PAYOUT_SETTLEMENT_CREATE, UI_PERMISSION.PAYOUT_SETTLEMENT_VIEW_SELF];
    }
    if (pathname.endsWith("/aeps/transactions")) {
      return UI_PERMISSION.AEPS_NETWORK_TRANSACTION_VIEW;
    }
    if (pathname.endsWith("/merchants/add") || pathname.endsWith("/retailers/add")) {
      return UI_PERMISSION.ACCOUNT_CREATE;
    }
    if (pathname.endsWith("/merchants/list") || pathname.endsWith("/retailers")) {
      return UI_PERMISSION.MEMBER_LIST;
    }
    if (pathname.endsWith("/banking")) return UI_PERMISSION.BANK_ACCOUNT_LIST;
    if (pathname.endsWith("/kyc")) return UI_PERMISSION.KYC_REVIEW_LIST;
    if (pathname.endsWith("/transactions")) {
      return navigationRole === "ADMIN" || navigationRole === "SUPER_ADMIN"
        ? UI_PERMISSION.TRANSACTION_ADMIN_LIST
        : UI_PERMISSION.AEPS_NETWORK_TRANSACTION_VIEW;
    }
    return undefined;
  })();

  return (
    <div className="min-h-screen bg-[#f3f8f6] text-secondary">
      <header className="sticky top-0 z-40 border-b border-border bg-white">
        <div className="flex h-[74px] items-center px-4 sm:px-7">
          <button
            onClick={() => setMenu(true)}
            aria-label="Open admin menu"
            className="mr-3 grid h-10 w-10 place-items-center rounded-xl border border-border lg:hidden"
          >
            <Menu size={20} />
          </button>
          <img src={logo} alt="UMOBIPAY" className="h-9 w-auto" />
          <button
            aria-label="Notifications"
            className="ml-auto grid h-10 w-10 place-items-center rounded-xl border border-border"
          >
            <Bell size={18} />
          </button>
          <div className="ml-3 hidden rounded-xl border border-border px-4 py-2 sm:block">
            <p className="text-xs font-extrabold">{actor?.name || "Administrator"}</p>
            <p className="text-[10px] text-muted-foreground">{actor?.role || "ADMIN"}</p>
          </div>
        </div>
        <div className="border-t border-border/60 bg-[#f8fbfa] px-4 py-2 sm:px-7">
          <div className="ml-auto w-full max-w-2xl">
            <WalletBalanceHeader identity={identity} role={actor?.role} />
          </div>
        </div>
      </header>
      <div className="flex min-h-[calc(100vh-74px)]">
        <AdminSidebar
          active={active}
          complianceGateActive={complianceGateActive}
          complianceMessage={complianceMessage}
          aepsLocked={aepsLocked}
        />
        {menu && (
          <>
            <button
              aria-label="Close menu overlay"
              onClick={() => setMenu(false)}
              className="fixed inset-0 z-40 bg-secondary/45 lg:hidden"
            />
            <AdminSidebar
              active={active}
              complianceGateActive={complianceGateActive}
              complianceMessage={complianceMessage}
              aepsLocked={aepsLocked}
              mobile
              onClose={() => setMenu(false)}
            />
          </>
        )}
        <main className="min-w-0 flex-1 p-5 sm:p-8 lg:p-10">
          <div className="mx-auto max-w-[1500px]">
            {eyebrow && (
              <p className="text-xs font-extrabold uppercase tracking-[.18em] text-primary">
                {eyebrow}
              </p>
            )}
            <h1 className="mt-1 text-3xl font-black sm:text-4xl">{title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
            <div className="mt-6">
              <SectionTabs
                tabs={sectionTabs}
                role={identity?.role || actor?.role}
                access={actor?.kind === "IDENTITY_ADMIN" ? access : null}
                dedicatedSuperAdmin={actor?.kind === "SUPER_ADMIN"}
              />
            </div>
            <div className={sectionTabs.length ? "" : "mt-7"}>
              <PermissionBoundary
                area={selfServiceCompliance ? "profile" : routeArea || "dashboard"}
                role={identity?.role || actor?.role}
                access={actor?.kind === "IDENTITY_ADMIN" ? access : null}
                dedicatedSuperAdmin={actor?.kind === "SUPER_ADMIN"}
              >
                {routePermission ? (
                  <PermissionBoundary
                    permission={routePermission}
                    role={identity?.role || actor?.role}
                    access={actor?.kind === "IDENTITY_ADMIN" ? access : null}
                    dedicatedSuperAdmin={actor?.kind === "SUPER_ADMIN"}
                    fallbackRoles={navigationRole ? [navigationRole] : []}
                  >
                    {children}
                  </PermissionBoundary>
                ) : (
                  children
                )}
              </PermissionBoundary>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export function AdminPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

export function ServiceState({
  title,
  description,
  status = "Ready for integration",
}: {
  title: string;
  description: string;
  status?: string;
}) {
  return (
    <AdminPanel>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-black">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        <span className="w-fit whitespace-nowrap rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-700">
          {status}
        </span>
      </div>
    </AdminPanel>
  );
}
