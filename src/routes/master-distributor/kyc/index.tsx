import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { MasterDistributorModulePlaceholder } from "@/components/master-distributor/module-placeholder";
export const Route = createFileRoute("/master-distributor/kyc/")({ component: Page });
function Page() {
  return (
    <MasterDistributorModulePlaceholder
      active="kyc"
      icon={ShieldCheck}
      title="Network KYC monitoring"
      description="Monitor Distributor and downstream Retailer verification status."
      pending="A hierarchy-scoped KYC queue is not exposed by the current backend. Approval controls will only be enabled when role authorization is enforced server-side."
    />
  );
}
