import { createFileRoute } from "@tanstack/react-router";
import { HandCoins } from "lucide-react";
import { MasterDistributorModulePlaceholder } from "@/components/master-distributor/module-placeholder";
export const Route = createFileRoute("/master-distributor/wallet/requests")({ component: Page });
function Page() {
  return (
    <MasterDistributorModulePlaceholder
      active="settlements"
      icon={HandCoins}
      title="Fund requests"
      description="Create and track wallet funding requests."
      pending="The current backend has no protected Master Distributor fund-request lifecycle endpoint."
    />
  );
}
