import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  Building2,
  CircleDollarSign,
  FileBarChart,
  Fingerprint,
  Landmark,
  LayoutDashboard,
  MessageSquareText,
  Percent,
  Plug,
  Receipt,
  Scale,
  Settings,
  ShieldCheck,
  UserCircle,
  Users,
  Wallet,
} from "lucide-react";
import type { PlatformRole } from "@/lib/role-hierarchy";
import type { UiArea } from "@/lib/ui-permissions";

export type NavigationKey =
  | "dashboard"
  | "profile"
  | "members"
  | "transactions"
  | "bankOperations"
  | "bankAccounts"
  | "kycReview"
  | "kycSelf"
  | "aeps"
  | "commissionSetup"
  | "earnings"
  | "settlements"
  | "wallet"
  | "reports"
  | "activity"
  | "access"
  | "api"
  | "settings"
  | "legal"
  | "sms"
  | "support";

export type AppNavigationItem = {
  key: NavigationKey;
  active: string;
  activeByRole?: Partial<Record<PlatformRole, string>>;
  label: string;
  labels?: Partial<Record<PlatformRole, string>>;
  destinations: Partial<Record<PlatformRole, string>>;
  area: UiArea;
  icon: LucideIcon;
  order: Partial<Record<PlatformRole, number>>;
};

/**
 * The single navigation registry for every signed-in workspace.
 *
 * A role entry only selects the route/data-scope variant that exists for that
 * identity type. Permission visibility is evaluated separately through
 * `canAccessUiArea`; adding a role here must never grant access on its own.
 */
export const APP_NAVIGATION: readonly AppNavigationItem[] = [
  {
    key: "dashboard",
    active: "dashboard",
    label: "Dashboard",
    labels: { SUPER_ADMIN: "Command center", ADMIN: "Command center" },
    destinations: {
      SUPER_ADMIN: "/admin",
      ADMIN: "/admin",
      MASTER_DISTRIBUTOR: "/master-distributor/dashboard",
      DISTRIBUTOR: "/distributor/dashboard",
      RETAILER: "/retailer/dashboard",
    },
    area: "dashboard",
    icon: LayoutDashboard,
    order: { SUPER_ADMIN: 10, ADMIN: 10, MASTER_DISTRIBUTOR: 10, DISTRIBUTOR: 10, RETAILER: 10 },
  },
  {
    key: "profile",
    active: "profile",
    label: "Profile & KYC",
    labels: { SUPER_ADMIN: "My profile & compliance", ADMIN: "My profile & compliance" },
    destinations: {
      SUPER_ADMIN: "/admin/profile",
      ADMIN: "/admin/profile",
      MASTER_DISTRIBUTOR: "/master-distributor/profile",
      DISTRIBUTOR: "/distributor/profile",
    },
    area: "profile",
    icon: UserCircle,
    order: { SUPER_ADMIN: 20, ADMIN: 20, MASTER_DISTRIBUTOR: 90, DISTRIBUTOR: 90 },
  },
  {
    key: "members",
    active: "merchants",
    label: "Member management",
    labels: { MASTER_DISTRIBUTOR: "Network", DISTRIBUTOR: "Retailers" },
    destinations: {
      SUPER_ADMIN: "/admin/merchants",
      ADMIN: "/admin/merchants",
      MASTER_DISTRIBUTOR: "/master-distributor/network/distributors",
      DISTRIBUTOR: "/distributor/retailers",
    },
    area: "members",
    icon: Users,
    order: { SUPER_ADMIN: 30, ADMIN: 30, MASTER_DISTRIBUTOR: 20, DISTRIBUTOR: 20 },
  },
  {
    key: "transactions",
    active: "transactions",
    label: "Transactions",
    destinations: {
      SUPER_ADMIN: "/admin/transactions",
      ADMIN: "/admin/transactions",
      MASTER_DISTRIBUTOR: "/master-distributor/transactions",
      DISTRIBUTOR: "/distributor/aeps/transactions",
      RETAILER: "/retailer/transactions",
    },
    area: "transactions",
    icon: Receipt,
    order: { SUPER_ADMIN: 40, ADMIN: 40, MASTER_DISTRIBUTOR: 40, DISTRIBUTOR: 40, RETAILER: 60 },
  },
  {
    key: "bankOperations",
    active: "banking",
    activeByRole: { RETAILER: "bank" },
    label: "Bank operations",
    destinations: { SUPER_ADMIN: "/admin/banking", ADMIN: "/admin/banking" },
    area: "banking",
    icon: Landmark,
    order: { SUPER_ADMIN: 50, ADMIN: 50 },
  },
  {
    key: "bankAccounts",
    active: "banking",
    label: "Bank accounts",
    destinations: {
      MASTER_DISTRIBUTOR: "/master-distributor/profile/bank",
      DISTRIBUTOR: "/distributor/profile/bank",
      RETAILER: "/retailer/bank",
    },
    area: "bankAccounts",
    icon: Landmark,
    order: { MASTER_DISTRIBUTOR: 80, DISTRIBUTOR: 80, RETAILER: 30 },
  },
  {
    key: "kycReview",
    active: "kyc",
    label: "KYC approvals",
    labels: { MASTER_DISTRIBUTOR: "KYC monitoring" },
    destinations: {
      SUPER_ADMIN: "/admin/kyc",
      ADMIN: "/admin/kyc",
      MASTER_DISTRIBUTOR: "/master-distributor/kyc",
    },
    area: "kyc",
    icon: ShieldCheck,
    order: { SUPER_ADMIN: 60, ADMIN: 60, MASTER_DISTRIBUTOR: 50 },
  },
  {
    key: "kycSelf",
    active: "kyc",
    label: "KYC verification",
    destinations: { RETAILER: "/retailer/kyc" },
    area: "kycSelf",
    icon: ShieldCheck,
    order: { RETAILER: 20 },
  },
  {
    key: "aeps",
    active: "aeps",
    label: "AEPS",
    labels: { SUPER_ADMIN: "AEPS management", ADMIN: "AEPS management" },
    destinations: {
      SUPER_ADMIN: "/admin/aeps",
      ADMIN: "/admin/aeps",
      MASTER_DISTRIBUTOR: "/master-distributor/aeps",
      DISTRIBUTOR: "/distributor/aeps",
      RETAILER: "/retailer/aeps",
    },
    area: "aeps",
    icon: Fingerprint,
    order: { SUPER_ADMIN: 70, ADMIN: 70, MASTER_DISTRIBUTOR: 30, DISTRIBUTOR: 30, RETAILER: 40 },
  },
  {
    key: "commissionSetup",
    active: "commissions",
    activeByRole: { RETAILER: "commission" },
    label: "Commission setup",
    destinations: { SUPER_ADMIN: "/admin/commissions", ADMIN: "/admin/commissions" },
    area: "commissions",
    icon: Percent,
    order: { SUPER_ADMIN: 80, ADMIN: 80 },
  },
  {
    key: "earnings",
    active: "commissions",
    label: "Commission & earnings",
    labels: { RETAILER: "Commission" },
    destinations: {
      MASTER_DISTRIBUTOR: "/master-distributor/commission",
      DISTRIBUTOR: "/distributor/commission",
      RETAILER: "/retailer/commission",
    },
    area: "earnings",
    icon: CircleDollarSign,
    order: { MASTER_DISTRIBUTOR: 60, DISTRIBUTOR: 60, RETAILER: 90 },
  },
  {
    key: "settlements",
    active: "settlements",
    activeByRole: { RETAILER: "wallet" },
    label: "Wallet & settlements",
    destinations: { SUPER_ADMIN: "/admin/settlements", ADMIN: "/admin/settlements" },
    area: "settlements",
    icon: Wallet,
    order: { SUPER_ADMIN: 90, ADMIN: 90 },
  },
  {
    key: "wallet",
    active: "settlements",
    label: "Wallet & funds",
    labels: { DISTRIBUTOR: "Wallet", RETAILER: "Wallet & transfer" },
    destinations: {
      MASTER_DISTRIBUTOR: "/master-distributor/wallet",
      DISTRIBUTOR: "/distributor/wallet",
      RETAILER: "/retailer/wallet",
    },
    area: "wallet",
    icon: Wallet,
    order: { MASTER_DISTRIBUTOR: 70, DISTRIBUTOR: 70, RETAILER: 50 },
  },
  {
    key: "reports",
    active: "reports",
    label: "Reports",
    labels: { SUPER_ADMIN: "All reports", ADMIN: "All reports" },
    destinations: {
      SUPER_ADMIN: "/admin/reports",
      ADMIN: "/admin/reports",
      MASTER_DISTRIBUTOR: "/master-distributor/reports",
      DISTRIBUTOR: "/distributor/reports",
      RETAILER: "/retailer/reports",
    },
    area: "reports",
    icon: FileBarChart,
    order: {
      SUPER_ADMIN: 110,
      ADMIN: 110,
      MASTER_DISTRIBUTOR: 100,
      DISTRIBUTOR: 100,
      RETAILER: 70,
    },
  },
  {
    key: "activity",
    active: "activity",
    label: "Account activity",
    destinations: { RETAILER: "/activity" },
    area: "activity",
    icon: FileBarChart,
    order: { RETAILER: 80 },
  },
  {
    key: "access",
    active: "access",
    label: "Roles & access",
    destinations: { SUPER_ADMIN: "/admin/access", ADMIN: "/admin/access" },
    area: "access",
    icon: Building2,
    order: { SUPER_ADMIN: 100, ADMIN: 100 },
  },
  {
    key: "api",
    active: "api",
    label: "API settings",
    destinations: { SUPER_ADMIN: "/admin/api-settings", ADMIN: "/admin/api-settings" },
    area: "api",
    icon: Plug,
    order: { SUPER_ADMIN: 120, ADMIN: 120 },
  },
  {
    key: "settings",
    active: "settings",
    label: "Settings",
    labels: { SUPER_ADMIN: "System settings", ADMIN: "System settings" },
    destinations: {
      SUPER_ADMIN: "/admin/settings",
      ADMIN: "/admin/settings",
      MASTER_DISTRIBUTOR: "/master-distributor/settings",
      DISTRIBUTOR: "/distributor/settings",
      RETAILER: "/retailer/settings",
    },
    area: "settings",
    icon: Settings,
    order: {
      SUPER_ADMIN: 130,
      ADMIN: 130,
      MASTER_DISTRIBUTOR: 120,
      DISTRIBUTOR: 120,
      RETAILER: 100,
    },
  },
  {
    key: "legal",
    active: "legal",
    label: "Legal documents",
    destinations: { SUPER_ADMIN: "/admin/legal", ADMIN: "/admin/legal" },
    area: "legal",
    icon: Scale,
    order: { SUPER_ADMIN: 140, ADMIN: 140 },
  },
  {
    key: "sms",
    active: "sms",
    label: "SMS settings",
    destinations: { SUPER_ADMIN: "/admin/sms", ADMIN: "/admin/sms" },
    area: "sms",
    icon: MessageSquareText,
    order: { SUPER_ADMIN: 150, ADMIN: 150 },
  },
  {
    key: "support",
    active: "sms",
    label: "Support",
    destinations: {
      MASTER_DISTRIBUTOR: "/master-distributor/support",
      DISTRIBUTOR: "/distributor/support",
    },
    area: "support",
    icon: MessageSquareText,
    order: { MASTER_DISTRIBUTOR: 110, DISTRIBUTOR: 110 },
  },
] as const;

export type ResolvedNavigationItem = Omit<
  AppNavigationItem,
  "destinations" | "labels" | "activeByRole"
> & {
  label: string;
  to: string;
};

export function navigationForRole(role: PlatformRole): ResolvedNavigationItem[] {
  return APP_NAVIGATION.flatMap((item) => {
    const to = item.destinations[role];
    if (!to) return [];
    return [
      {
        ...item,
        active: item.activeByRole?.[role] || item.active,
        label: item.labels?.[role] || item.label,
        to,
      },
    ];
  }).sort((left, right) => (left.order[role] ?? 999) - (right.order[role] ?? 999));
}

export function navigationItem(key: NavigationKey): AppNavigationItem {
  const item = APP_NAVIGATION.find((entry) => entry.key === key);
  if (!item) throw new Error(`Unknown navigation item: ${key}`);
  return item;
}
