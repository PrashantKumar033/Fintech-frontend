import { createFileRoute } from "@tanstack/react-router";
import { History } from "lucide-react";
import { MasterDistributorModulePlaceholder } from "@/components/master-distributor/module-placeholder";
export const Route = createFileRoute("/master-distributor/wallet/history")({ component: Page });
function Page() {
  return (
    <MasterDistributorModulePlaceholder
      active="settlements"
      icon={History}
      title="Wallet history"
      description="Review credits, debits and closing balances."
      pending="The backend currently returns wallet balances but does not expose a dedicated Master Distributor ledger endpoint."
    />
  );
}
