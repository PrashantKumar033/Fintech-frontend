import { createFileRoute } from "@tanstack/react-router";
import { ManagementRoutePage } from "@/components/admin/management-route-page";

export const Route = createFileRoute("/master-distributor/$")({
  component: () => <ManagementRoutePage role="MASTER_DISTRIBUTOR" base="/master-distributor" />,
});
