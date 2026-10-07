import { createFileRoute } from "@tanstack/react-router";
import { Headphones } from "lucide-react";
import { MasterDistributorModulePlaceholder } from "@/components/master-distributor/module-placeholder";
export const Route = createFileRoute("/master-distributor/support/")({ component: Page });
function Page() {
  return (
    <MasterDistributorModulePlaceholder
      active="settings"
      icon={Headphones}
      title="Support tickets"
      description="Raise and monitor operational support requests."
      pending="A ticket lifecycle API is not present in the current backend."
    />
  );
}
