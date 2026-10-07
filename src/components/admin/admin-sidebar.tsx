import { Link, useLocation } from "@tanstack/react-router";
import { Lock, LogOut, X } from "lucide-react";
import { adminAuthApi, getAdminActor } from "@/lib/admin-api";
import { getSession } from "@/lib/auth-api";
import { useEffectiveAccess } from "@/hooks/use-effective-access";
import {
  credentialsPending as hasPendingCredentials,
  resolveWorkspaceRole,
} from "@/lib/role-hierarchy";
import { navigationForRole } from "@/lib/app-navigation";
import { canAccessUiArea } from "@/lib/ui-permissions";

export type AdminArea =
  | "dashboard"
  | "profile"
  | "merchants"
  | "transactions"
  | "banking"
  | "kyc"
  | "aeps"
  | "commissions"
  | "settlements"
  | "access"
  | "reports"
  | "api"
  | "settings"
  | "legal"
  | "sms";

export function AdminSidebar({
  active,
  complianceGateActive = false,
  complianceMessage = "Submit KYC and add a bank account to unlock the remaining services.",
  aepsLocked = false,
  mobile = false,
  onClose,
}: {
  active: AdminArea;
  complianceGateActive?: boolean;
  complianceMessage?: string;
  aepsLocked?: boolean;
  mobile?: boolean;
  onClose?: () => void;
}) {
  const pathname = useLocation({ select: (location) => location.pathname });
  const actor = getAdminActor();
  const identity = actor?.kind === "IDENTITY_ADMIN" ? getSession()?.identity : undefined;
  const credentialsPending = hasPendingCredentials(identity);
  const { access } = useEffectiveAccess();
  const role = resolveWorkspaceRole(identity?.role, access);
  const navigationRole = role || resolveWorkspaceRole(actor?.role, access);

  async function logout() {
    const destination = getAdminActor()?.kind === "SUPER_ADMIN" ? "/admin/login" : "/login";
    try {
      await adminAuthApi.logout();
    } finally {
      window.location.assign(destination);
    }
  }

  const visibleItems = navigationRole
    ? navigationForRole(navigationRole).filter((item) =>
        canAccessUiArea(item.area, {
          role: identity?.role || actor?.role,
          access: actor?.kind === "IDENTITY_ADMIN" ? access : null,
          dedicatedSuperAdmin: actor?.kind === "SUPER_ADMIN",
        }),
      )
    : [];
  const pathnameItem = [...visibleItems]
    .filter((item) => pathname === item.to || pathname.startsWith(`${item.to}/`))
    .sort((left, right) => right.to.length - left.to.length)[0];
  const complianceAllowedKeys = new Set(["profile", "bankAccounts", "settings"]);

  return (
    <aside
      className={`${mobile ? "fixed inset-y-0 left-0 z-50 shadow-2xl" : "sticky top-[74px] hidden h-[calc(100vh-74px)] self-start lg:flex"} w-[278px] shrink-0 flex-col overflow-hidden border-r border-border bg-white p-5`}
    >
      {mobile && (
        <button
          onClick={onClose}
          aria-label="Close menu"
          className="ml-auto grid h-10 w-10 place-items-center rounded-xl hover:bg-muted"
        >
          <X size={20} />
        </button>
      )}
      <div className="rounded-2xl bg-secondary p-5 text-white">
        <p className="text-xs font-extrabold uppercase tracking-[.18em] text-primary">UMOBIPAY</p>
        <p className="mt-2 text-xl font-black">
          {role === "MASTER_DISTRIBUTOR"
            ? "Master Distributor"
            : role === "DISTRIBUTOR"
              ? "Distributor Console"
              : "Admin Console"}
        </p>
        <p className="mt-1 text-xs text-white/55">Secure operations workspace</p>
      </div>
      {complianceGateActive ? (
        <div className="mt-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <Lock size={14} className="mt-0.5 shrink-0" />
          <span>{complianceMessage}</span>
        </div>
      ) : null}
      <nav
        aria-label="Admin navigation"
        className="mt-6 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1"
      >
        {visibleItems.map(({ key, active: itemActive, label, to, icon: Icon }) => {
          const complianceLocked = complianceGateActive && !complianceAllowedKeys.has(key);
          const locked =
            (credentialsPending && itemActive !== "settings") ||
            complianceLocked ||
            (key === "aeps" && aepsLocked);
          const lockTitle = credentialsPending
            ? "Change temporary password and MPIN in Settings to unlock"
            : complianceLocked
              ? complianceMessage
              : "KYC approval and a verified bank account are required for AEPS";
          const selected = pathnameItem ? pathnameItem.key === key : active === itemActive;

          return locked ? (
            <div
              key={key}
              title={lockTitle}
              aria-disabled="true"
              className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-muted-foreground/55"
            >
              <Icon size={19} />
              <span className="flex-1">{label}</span>
              <Lock size={14} />
            </div>
          ) : (
            <Link
              key={key}
              to={to as never}
              onClick={onClose}
              aria-current={selected ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition ${selected ? "bg-primary text-white shadow-md shadow-primary/20" : "text-secondary hover:bg-secondary/5"}`}
            >
              <Icon size={19} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      <button
        onClick={logout}
        className="mt-4 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-red-600 hover:bg-red-50"
      >
        <LogOut size={19} /> Sign out
      </button>
    </aside>
  );
}
