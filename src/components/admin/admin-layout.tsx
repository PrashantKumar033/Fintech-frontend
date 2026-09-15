import { useEffect, useState, type ReactNode } from "react";
import { Bell, Menu, Search } from "lucide-react";
import logo from "@/assets/logo.png";
import { getAdminActor, getAdminSession } from "@/lib/admin-api";
import { getSession } from "@/lib/auth-api";
import { useEffectiveAccess } from "@/hooks/use-effective-access";
import { PermissionBoundary } from "@/components/permission-boundary";
import type { UiArea } from "@/lib/ui-permissions";
import {
  credentialsPending,
  identityVerificationPending,
  isManagementRole,
  managementBasePath,
} from "@/lib/role-hierarchy";
import { AdminSidebar, type AdminArea } from "./admin-sidebar";
import { SectionTabs } from "@/components/section-tabs";
import { managementSectionTabs } from "@/lib/management-section-tabs";

// Child admin routes currently own their page metadata and therefore mount the
// shell component independently. Remember a successful client-side guard pass
// so SPA navigation never replaces the whole workspace with a loading screen.
let adminWorkspaceReady = false;

export function AdminLayout({
  active,
  eyebrow,
  title,
  description,
  children,
}: {
  active: AdminArea;
  eyebrow?: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const [ready, setReady] = useState(adminWorkspaceReady);
  const [menu, setMenu] = useState(false);
  const actor = getAdminActor();
  const identity = getSession()?.identity;
  const { access } = useEffectiveAccess();

  useEffect(() => {
    if (!getAdminActor()) return window.location.replace("/login");
    if (getAdminSession()?.onboardingRequired) return window.location.replace("/admin/onboarding");
    const identitySession = getSession();
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
    adminWorkspaceReady = true;
    setReady(true);
  }, [active]);
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

  const permissionArea: Record<AdminArea, UiArea> = {
    dashboard: "dashboard",
    profile: "profile",
    merchants: "members",
    transactions: "transactions",
    banking: "banking",
    kyc: "kyc",
    aeps: "aeps",
    commissions: "commissions",
    settlements: "settlements",
    access: "access",
    reports: "reports",
    api: "api",
    settings: "settings",
    legal: "legal",
    sms:
      identity?.role === "DISTRIBUTOR" || identity?.role === "MASTER_DISTRIBUTOR"
        ? "support"
        : "sms",
  };

  return (
    <div className="min-h-screen bg-[#f3f8f6] text-secondary">
      <header className="sticky top-0 z-40 flex h-[74px] items-center border-b border-border bg-white px-4 sm:px-7">
        <button
          onClick={() => setMenu(true)}
          aria-label="Open admin menu"
          className="mr-3 grid h-10 w-10 place-items-center rounded-xl border border-border lg:hidden"
        >
          <Menu size={20} />
        </button>
        <img src={logo} alt="UMOBIPAY" className="h-9 w-auto" />
        <div className="ml-auto hidden w-72 items-center gap-2 rounded-xl bg-muted px-3 py-2.5 text-muted-foreground md:flex">
          <Search size={17} />
          <span className="text-xs">Search operations</span>
        </div>
        <button
          aria-label="Notifications"
          className="ml-3 grid h-10 w-10 place-items-center rounded-xl border border-border"
        >
          <Bell size={18} />
        </button>
        <div className="ml-3 hidden rounded-xl border border-border px-4 py-2 sm:block">
          <p className="text-xs font-extrabold">{actor?.name || "Administrator"}</p>
          <p className="text-[10px] text-muted-foreground">{actor?.role || "ADMIN"}</p>
        </div>
      </header>
      <div className="flex min-h-[calc(100vh-74px)]">
        <AdminSidebar active={active} />
        {menu && (
          <>
            <button
              aria-label="Close menu overlay"
              onClick={() => setMenu(false)}
              className="fixed inset-0 z-40 bg-secondary/45 lg:hidden"
            />
            <AdminSidebar active={active} mobile onClose={() => setMenu(false)} />
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
              <SectionTabs tabs={managementSectionTabs(identity?.role, active)} />
            </div>
            <div className={managementSectionTabs(identity?.role, active).length ? "" : "mt-7"}>
              <PermissionBoundary
                area={
                  active === "settlements" &&
                  (identity?.role === "DISTRIBUTOR" ||
                    identity?.role === "MASTER_DISTRIBUTOR")
                    ? "wallet"
                    : permissionArea[active]
                }
                role={identity?.role || actor?.role}
                access={actor?.kind === "IDENTITY_ADMIN" ? access : null}
                dedicatedSuperAdmin={actor?.kind === "SUPER_ADMIN"}
              >
                {children}
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
