import type { LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  Banknote,
  Building2,
  FileBarChart,
  Landmark,
  LayoutDashboard,
  Lock,
  LogOut,
  MessageSquareText,
  Percent,
  Plug,
  Scale,
  Settings,
  ShieldCheck,
  UserCircle,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { adminAuthApi, getAdminActor } from "@/lib/admin-api";
import { getSession } from "@/lib/auth-api";
import { useEffectiveAccess } from "@/hooks/use-effective-access";
import {
  credentialsPending as hasPendingCredentials,
  managementBasePath,
  normalizeRole,
} from "@/lib/role-hierarchy";
import { canAccessUiArea, type UiArea } from "@/lib/ui-permissions";

export type AdminArea =
  | "dashboard"
  | "profile"
  | "merchants"
  | "transactions"
  | "banking"
  | "kyc"
  | "commissions"
  | "settlements"
  | "access"
  | "reports"
  | "api"
  | "settings"
  | "legal"
  | "sms";

const items: Array<{ area: AdminArea; label: string; to: string; icon: LucideIcon }> = [
  { area: "dashboard", label: "Command center", to: "/admin", icon: LayoutDashboard },
  { area: "profile", label: "My profile", to: "/admin/profile", icon: UserCircle },
  { area: "merchants", label: "Member management", to: "/admin/merchants", icon: Users },
  { area: "transactions", label: "Transactions", to: "/admin/transactions", icon: Banknote },
  { area: "banking", label: "Bank operations", to: "/admin/banking", icon: Landmark },
  { area: "kyc", label: "KYC approvals", to: "/admin/kyc", icon: ShieldCheck },
  { area: "commissions", label: "Commission setup", to: "/admin/commissions", icon: Percent },
  { area: "settlements", label: "Wallet & settlements", to: "/admin/settlements", icon: Wallet },
  { area: "access", label: "Roles & access", to: "/admin/access", icon: Building2 },
  { area: "reports", label: "All reports", to: "/admin/reports", icon: FileBarChart },
  { area: "api", label: "API settings", to: "/admin/api-settings", icon: Plug },
  { area: "settings", label: "System settings", to: "/admin/settings", icon: Settings },
  { area: "legal", label: "Legal documents", to: "/admin/legal", icon: Scale },
  { area: "sms", label: "SMS settings", to: "/admin/sms", icon: MessageSquareText },
];

const distributorItems: typeof items = [
  { area: "dashboard", label: "Dashboard", to: "/admin", icon: LayoutDashboard },
  { area: "merchants", label: "Retailers", to: "/admin/retailers", icon: Users },
  {
    area: "transactions",
    label: "AEPS transactions",
    to: "/admin/aeps/transactions",
    icon: Banknote,
  },
  { area: "commissions", label: "Commission & earnings", to: "/admin/commission", icon: Percent },
  { area: "settlements", label: "Wallet", to: "/admin/wallet", icon: Wallet },
  { area: "reports", label: "Reports", to: "/admin/reports", icon: FileBarChart },
  { area: "sms", label: "Support", to: "/admin/support", icon: MessageSquareText },
  { area: "profile", label: "Profile & KYC", to: "/admin/profile", icon: UserCircle },
  { area: "settings", label: "Settings", to: "/admin/settings", icon: Settings },
];

const masterDistributorItems: typeof items = [
  { area: "dashboard", label: "Dashboard", to: "/admin", icon: LayoutDashboard },
  { area: "merchants", label: "Network", to: "/admin/network/distributors", icon: Users },
  {
    area: "transactions",
    label: "Network transactions",
    to: "/admin/transactions",
    icon: Banknote,
  },
  { area: "commissions", label: "Commission & earnings", to: "/admin/commission", icon: Percent },
  { area: "settlements", label: "Wallet & funds", to: "/admin/wallet", icon: Wallet },
  { area: "reports", label: "Network reports", to: "/admin/reports", icon: FileBarChart },
  { area: "kyc", label: "KYC monitoring", to: "/admin/kyc", icon: ShieldCheck },
  { area: "sms", label: "Support", to: "/admin/support", icon: MessageSquareText },
  { area: "profile", label: "Profile", to: "/admin/profile", icon: UserCircle },
  { area: "settings", label: "Settings", to: "/admin/settings", icon: Settings },
];

const permissionArea: Record<AdminArea, UiArea> = {
  dashboard: "dashboard",
  profile: "profile",
  merchants: "members",
  transactions: "transactions",
  banking: "banking",
  kyc: "kyc",
  commissions: "commissions",
  settlements: "settlements",
  access: "access",
  reports: "reports",
  api: "api",
  settings: "settings",
  legal: "legal",
  sms: "sms",
};

export function AdminSidebar({
  active,
  mobile = false,
  onClose,
}: {
  active: AdminArea;
  mobile?: boolean;
  onClose?: () => void;
}) {
  const identity = getSession()?.identity;
  const credentialsPending = hasPendingCredentials(identity);
  const role = normalizeRole(identity?.role);
  const base = managementBasePath(role);
  const actor = getAdminActor();
  const { access } = useEffectiveAccess();

  async function logout() {
    const destination = getAdminActor()?.kind === "SUPER_ADMIN" ? "/admin/login" : "/login";
    try {
      await adminAuthApi.logout();
    } finally {
      window.location.assign(destination);
    }
  }

  const visibleItems =
    role === "DISTRIBUTOR"
      ? distributorItems
      : role === "MASTER_DISTRIBUTOR"
        ? masterDistributorItems
        : items;

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
      <nav
        aria-label="Admin navigation"
        className="mt-6 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1"
      >
        {visibleItems.map(({ area, label, to, icon: Icon }) => {
          const uiArea =
            area === "sms" && (role === "DISTRIBUTOR" || role === "MASTER_DISTRIBUTOR")
              ? "support"
              : permissionArea[area];
          const permissionDenied = !canAccessUiArea(uiArea, {
            role: role || actor?.role,
            access: actor?.kind === "IDENTITY_ADMIN" ? access : null,
            dedicatedSuperAdmin: actor?.kind === "SUPER_ADMIN",
          });
          const locked = (credentialsPending && area !== "settings") || permissionDenied;
          const destination = `${base}${to.slice("/admin".length)}`;

          return locked ? (
            <div
              key={area}
              title={
                permissionDenied
                  ? "Your active packages do not grant this section"
                  : "Change temporary password and MPIN in Settings to unlock"
              }
              className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-muted-foreground/55"
            >
              <Icon size={19} />
              <span className="flex-1">{label}</span>
              <Lock size={14} />
            </div>
          ) : (
            <Link
              key={area}
              to={destination as never}
              onClick={onClose}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition ${active === area ? "bg-primary text-white shadow-md shadow-primary/20" : "text-secondary hover:bg-secondary/5"}`}
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
