import type { ReactNode } from "react";
import type { Identity } from "@/lib/auth-api";
import { isManagementRole } from "@/lib/role-hierarchy";
import { AdminLayout } from "@/components/admin/admin-layout";
import { BusinessPage } from "@/components/business-page";

export function RoleAwareAccountPage({identity,section,eyebrow,title,description,children}:{identity:Identity;section:"kyc"|"bank";eyebrow:string;title:string;description:string;children:ReactNode}){
  if(isManagementRole(identity.role)) return <AdminLayout active="profile" eyebrow={eyebrow} title={title} description={description}>{children}</AdminLayout>;
  return <BusinessPage identity={identity} active={section} eyebrow={eyebrow} title={title} description={description}>{children}</BusinessPage>;
}
