import { createFileRoute } from "@tanstack/react-router";
import { ManagementRoutePage } from "@/components/admin/management-route-page";

export const Route = createFileRoute("/distributor/$")({
  component: () => <ManagementRoutePage role="DISTRIBUTOR" base="/distributor" />,
});
