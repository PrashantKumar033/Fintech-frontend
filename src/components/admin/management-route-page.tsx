import { useEffect, type ComponentType } from "react";
import { useLocation } from "@tanstack/react-router";
import { getSession } from "@/lib/auth-api";
import { normalizeRole, signedInHome, type PlatformRole } from "@/lib/role-hierarchy";
import { AdminDashboard } from "@/routes/admin";
import { AdminIdentitySetup } from "@/routes/admin/account-setup";
import { Profile } from "@/routes/admin/profile";
import { MemberManagementOverview, CreateMemberPage } from "@/routes/admin/merchants";
import { AdminSettings } from "@/routes/admin/settings";
import { Route as TransactionsRoute } from "@/routes/admin/transactions";
import { Access } from "@/routes/admin/access";
import { Route as MemberListRoute } from "@/routes/admin/merchants/list";
import { Route as BankingRoute } from "@/routes/admin/banking";
import { Route as KycRoute } from "@/routes/admin/kyc";
import { Route as CommissionsRoute } from "@/routes/admin/commissions";
import { Route as SettlementsRoute } from "@/routes/admin/settlements";
import { Route as ReportsRoute } from "@/routes/admin/reports";
import { Route as ApiSettingsRoute } from "@/routes/admin/api-settings";
import { Route as LegalRoute } from "@/routes/admin/legal";
import { Route as SmsRoute } from "@/routes/admin/sms";

const fromRoute = (route: { options: { component?: unknown } }) => route.options.component as ComponentType;

const pages: Record<string, ComponentType> = {
  "": AdminDashboard,
  profile: Profile,
  merchants: MemberManagementOverview,
  "merchants/add": CreateMemberPage,
  "merchants/list": fromRoute(MemberListRoute),
  transactions: fromRoute(TransactionsRoute),
  banking: fromRoute(BankingRoute),
  kyc: fromRoute(KycRoute),
  commissions: fromRoute(CommissionsRoute),
  settlements: fromRoute(SettlementsRoute),
  access: Access,
  reports: fromRoute(ReportsRoute),
  "api-settings": fromRoute(ApiSettingsRoute),
  settings: AdminSettings,
  legal: fromRoute(LegalRoute),
  sms: fromRoute(SmsRoute),
  "account-setup": AdminIdentitySetup,
};

export function ManagementRoutePage({ role, base }: { role: Extract<PlatformRole, "MASTER_DISTRIBUTOR" | "DISTRIBUTOR">; base: string }) {
  const pathname = useLocation({ select: location => location.pathname });
  const session = getSession();
  const suffix = pathname.slice(base.length).replace(/^\/+|\/+$/g, "");
  const Page = pages[suffix] || AdminDashboard;

  useEffect(() => {
    if (!session) return window.location.replace("/login");
    if (normalizeRole(session.identity.role) !== role) window.location.replace(signedInHome(session));
  }, [role, session]);

  if (!session || normalizeRole(session.identity.role) !== role) return null;
  return <Page />;
}
