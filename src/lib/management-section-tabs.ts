import type { AdminArea } from "@/components/admin/admin-sidebar";
import type { SectionTab } from "@/components/section-tabs";
import { normalizeRole } from "@/lib/role-hierarchy";

const tabs=(base:string,values:Array<[string,string]>):SectionTab[]=>values.map(([label,path])=>({label,href:`${base}${path}`}));

export function managementSectionTabs(roleValue:string|undefined,area:AdminArea):SectionTab[]{
  const role=normalizeRole(roleValue);
  if(role==="MASTER_DISTRIBUTOR"){
    const base="/master-distributor";
    const map:Partial<Record<AdminArea,SectionTab[]>>={
      merchants:tabs(base,[["Distributors","/network/distributors"],["Retailers","/network/retailers"],["Network Tree","/network/tree"]]),
      transactions:tabs(base,[["All Transactions","/transactions"],["Successful","/transactions?status=SUCCESS"],["Pending","/transactions?status=PENDING"],["Failed","/transactions?status=FAILED"]]),
      commissions:tabs(base,[["Commission History","/commission"],["Daily Earnings","/commission?view=daily"],["Monthly Earnings","/commission?view=monthly"]]),
      settlements:tabs(base,[["Balance","/wallet"],["Transfer Fund","/wallet/transfer"]]),
      reports:tabs(base,[["Business Report","/reports"],["Distributor Report","/reports?view=distributors"],["Retailer Report","/reports?view=retailers"],["Transaction Report","/reports?view=transactions"],["Commission Report","/reports?view=commission"]]),
      kyc:tabs(base,[["Distributor KYC","/kyc"],["Retailer Status","/kyc?view=retailers"]]),
      sms:tabs(base,[["Raise Ticket","/support"],["My Tickets","/support?view=tickets"]]),
      profile:tabs(base,[["Personal Details","/profile"],["KYC","/profile/kyc"],["Bank Details","/profile/bank"]]),
    };return map[area]||[];
  }
  if(role==="DISTRIBUTOR"){
    const base="/distributor";
    const map:Partial<Record<AdminArea,SectionTab[]>>={
      merchants:tabs(base,[["All Retailers","/retailers"],["Add Retailer","/retailers/add"],["Retailer Details","/retailers?view=details"]]),
      transactions:tabs(base,[["Transactions","/aeps/transactions"],["Cash Withdrawal","/aeps/cash-withdrawal"],["Balance Enquiry","/aeps/balance-enquiry"],["Mini Statement","/aeps/mini-statement"]]),
      commissions:tabs(base,[["Commission History","/commission"],["Daily Earnings","/commission?view=daily"],["Monthly Earnings","/commission?view=monthly"]]),
      settlements:tabs(base,[["Balance","/wallet"],["Transfer Fund","/wallet/transfer"]]),
      reports:tabs(base,[["Transaction Report","/reports"],["Retailer-wise Report","/reports?view=retailers"]]),
      sms:tabs(base,[["Raise Complaint","/support"],["My Tickets","/support?view=tickets"]]),
      profile:tabs(base,[["Personal Details","/profile"],["KYC","/profile/kyc"],["Bank Details","/profile/bank"]]),
    };return map[area]||[];
  }
  if(role==="ADMIN"){
    return area==="profile"?tabs("/admin",[["Personal Details","/profile"],["KYC","/profile/kyc"],["Bank Details","/profile/bank"]]):[];
  }
  return [];
}
