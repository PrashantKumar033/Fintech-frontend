import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { MasterDistributorModulePlaceholder } from "@/components/master-distributor/module-placeholder";
export const Route = createFileRoute("/master-distributor/notifications/")({ component: Page });
function Page() {
  return (
    <MasterDistributorModulePlaceholder
      active="settings"
      icon={Bell}
      title="Notifications"
      description="Operational alerts and account messages."
      pending="A role-scoped notification inbox endpoint is not available yet."
    />
  );
}
