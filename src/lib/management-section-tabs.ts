import type { AdminArea } from "@/components/admin/admin-sidebar";
import type { SectionTab } from "@/components/section-tabs";
import { resolveWorkspaceRole } from "@/lib/role-hierarchy";
import { UI_PERMISSION } from "@/lib/ui-permissions";

const tabs = (
  base: string,
  values: Array<[string, string, (string | readonly string[])?]>,
): SectionTab[] =>
  values.map(([label, path, permission]) => ({
    label,
    href: `${base}${path}`,
    ...(permission ? { permission } : {}),
  }));

export function managementSectionTabs(
  roleValue: string | undefined,
  area: AdminArea,
): SectionTab[] {
  const role = resolveWorkspaceRole(roleValue);
  if (role === "SUPER_ADMIN") {
    if (area === "settings")
      return tabs("/admin", [
        ["Security", "/settings"],
        ["Devices & access", "/settings?view=access"],
      ]);
    return [];
  }
  if (role === "MASTER_DISTRIBUTOR") {
    const base = "/master-distributor";
    const map: Partial<Record<AdminArea, SectionTab[]>> = {
      merchants: tabs(base, [
        ["Distributors", "/network/distributors", UI_PERMISSION.MEMBER_LIST],
        ["Retailers", "/network/retailers", UI_PERMISSION.MEMBER_LIST],
        ["Network Tree", "/network/tree", UI_PERMISSION.MEMBER_LIST],
      ]),
      transactions: tabs(base, [
        ["All Transactions", "/transactions", UI_PERMISSION.AEPS_NETWORK_TRANSACTION_VIEW],
        ["Successful", "/transactions?status=SUCCESS", UI_PERMISSION.AEPS_NETWORK_TRANSACTION_VIEW],
        ["Pending", "/transactions?status=PENDING", UI_PERMISSION.AEPS_NETWORK_TRANSACTION_VIEW],
        ["Failed", "/transactions?status=FAILED", UI_PERMISSION.AEPS_NETWORK_TRANSACTION_VIEW],
      ]),
      aeps: tabs(base, [
        ["My AEPS", "/aeps", UI_PERMISSION.AEPS_VIEW],
        ["Network transactions", "/transactions", UI_PERMISSION.AEPS_NETWORK_TRANSACTION_VIEW],
        ["Successful", "/transactions?status=SUCCESS", UI_PERMISSION.AEPS_NETWORK_TRANSACTION_VIEW],
        ["Pending", "/transactions?status=PENDING", UI_PERMISSION.AEPS_NETWORK_TRANSACTION_VIEW],
        ["Failed", "/transactions?status=FAILED", UI_PERMISSION.AEPS_NETWORK_TRANSACTION_VIEW],
      ]),
      commissions: tabs(base, [
        ["Commission History", "/commission", UI_PERMISSION.WALLET_TRANSACTION_VIEW],
        ["Daily Earnings", "/commission?view=daily", UI_PERMISSION.WALLET_TRANSACTION_VIEW],
        ["Monthly Earnings", "/commission?view=monthly", UI_PERMISSION.WALLET_TRANSACTION_VIEW],
      ]),
      settlements: tabs(base, [
        ["Balance", "/wallet", UI_PERMISSION.WALLET_VIEW],
        ["Add Money", "/wallet/requests", UI_PERMISSION.WALLET_FUND_REQUEST],
        [
          "Payout to Bank",
          "/wallet/payout",
          [UI_PERMISSION.PAYOUT_SETTLEMENT_CREATE, UI_PERMISSION.PAYOUT_SETTLEMENT_VIEW_SELF],
        ],
        ["Transfer Fund", "/wallet/transfer", UI_PERMISSION.WALLET_TRANSFER],
        ["Wallet History", "/wallet/history", UI_PERMISSION.WALLET_TRANSACTION_VIEW],
        ["Wallet Holds", "/wallet/holds", UI_PERMISSION.WALLET_HOLD_VIEW],
      ]),
      reports: tabs(base, [
        ["Financial Report", "/reports", UI_PERMISSION.WALLET_TRANSACTION_VIEW],
      ]),
      kyc: tabs(base, [
        ["Distributor KYC", "/kyc", UI_PERMISSION.KYC_REVIEW_LIST],
        ["Retailer Status", "/kyc?view=retailers", UI_PERMISSION.KYC_REVIEW_LIST],
      ]),
      sms: tabs(base, [
        ["Raise Ticket", "/support"],
        ["My Tickets", "/support?view=tickets"],
      ]),
      profile: tabs(base, [
        ["Personal Details", "/profile"],
        ["KYC", "/profile/kyc"],
        ["Bank Details", "/profile/bank"],
      ]),
      settings: tabs(base, [
        ["Security", "/settings"],
        ["Contact verification", "/settings?view=verification"],
        ["Devices & access", "/settings?view=access"],
      ]),
    };
    return map[area] || [];
  }
  if (role === "DISTRIBUTOR") {
    const base = "/distributor";
    const map: Partial<Record<AdminArea, SectionTab[]>> = {
      merchants: tabs(base, [
        ["All Retailers", "/retailers", UI_PERMISSION.MEMBER_LIST],
        ["Add Retailer", "/retailers/add", UI_PERMISSION.ACCOUNT_CREATE],
        ["Retailer Details", "/retailers?view=details", UI_PERMISSION.MEMBER_VIEW],
      ]),
      transactions: tabs(base, [
        ["Transactions", "/aeps/transactions", UI_PERMISSION.AEPS_NETWORK_TRANSACTION_VIEW],
        ["Cash Withdrawal", "/aeps/cash-withdrawal", UI_PERMISSION.AEPS_CASH_WITHDRAWAL],
        ["Balance Enquiry", "/aeps/balance-enquiry", UI_PERMISSION.AEPS_BALANCE_ENQUIRY],
        ["Mini Statement", "/aeps/mini-statement", UI_PERMISSION.AEPS_MINI_STATEMENT],
      ]),
      aeps: tabs(base, [
        ["My AEPS", "/aeps", UI_PERMISSION.AEPS_VIEW],
        ["Network transactions", "/aeps/transactions", UI_PERMISSION.AEPS_NETWORK_TRANSACTION_VIEW],
        ["Cash Withdrawal", "/aeps/cash-withdrawal", UI_PERMISSION.AEPS_CASH_WITHDRAWAL],
        ["Balance Enquiry", "/aeps/balance-enquiry", UI_PERMISSION.AEPS_BALANCE_ENQUIRY],
        ["Mini Statement", "/aeps/mini-statement", UI_PERMISSION.AEPS_MINI_STATEMENT],
      ]),
      commissions: tabs(base, [
        ["Commission History", "/commission", UI_PERMISSION.WALLET_TRANSACTION_VIEW],
        ["Daily Earnings", "/commission?view=daily", UI_PERMISSION.WALLET_TRANSACTION_VIEW],
        ["Monthly Earnings", "/commission?view=monthly", UI_PERMISSION.WALLET_TRANSACTION_VIEW],
      ]),
      settlements: tabs(base, [
        ["Balance", "/wallet", UI_PERMISSION.WALLET_VIEW],
        ["Add Money", "/wallet/requests", UI_PERMISSION.WALLET_FUND_REQUEST],
        [
          "Payout to Bank",
          "/wallet/payout",
          [UI_PERMISSION.PAYOUT_SETTLEMENT_CREATE, UI_PERMISSION.PAYOUT_SETTLEMENT_VIEW_SELF],
        ],
        ["Transfer Fund", "/wallet/transfer", UI_PERMISSION.WALLET_TRANSFER],
        ["Wallet History", "/wallet/history", UI_PERMISSION.WALLET_TRANSACTION_VIEW],
        ["Wallet Holds", "/wallet/holds", UI_PERMISSION.WALLET_HOLD_VIEW],
      ]),
      reports: tabs(base, [
        ["Financial Report", "/reports", UI_PERMISSION.WALLET_TRANSACTION_VIEW],
      ]),
      sms: tabs(base, [
        ["Raise Complaint", "/support"],
        ["My Tickets", "/support?view=tickets"],
      ]),
      profile: tabs(base, [
        ["Personal Details", "/profile"],
        ["KYC", "/profile/kyc"],
        ["Bank Details", "/profile/bank"],
      ]),
      settings: tabs(base, [
        ["Security", "/settings"],
        ["Contact verification", "/settings?view=verification"],
        ["Devices & access", "/settings?view=access"],
      ]),
    };
    return map[area] || [];
  }
  if (role === "ADMIN") {
    if (area === "profile")
      return tabs("/admin", [
        ["Personal Details", "/profile"],
        ["KYC", "/profile/kyc"],
        ["Bank Details", "/profile/bank"],
      ]);
    if (area === "aeps")
      return tabs("/admin", [
        ["My AEPS", "/aeps", UI_PERMISSION.AEPS_VIEW],
        ["Merchants", "/merchants/list", UI_PERMISSION.MEMBER_LIST],
        ["Transactions", "/transactions", UI_PERMISSION.TRANSACTION_ADMIN_LIST],
        ["Provider controls", "/api-settings", UI_PERMISSION.AEPS_PROVIDER_STATUS_VIEW],
      ]);
    if (area === "settings")
      return tabs("/admin", [
        ["Security", "/settings"],
        ["Contact verification", "/settings?view=verification"],
        ["Devices & access", "/settings?view=access"],
      ]);
    return [];
  }
  return [];
}
