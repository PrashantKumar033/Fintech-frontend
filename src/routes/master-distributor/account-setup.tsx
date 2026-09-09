import { createFileRoute } from "@tanstack/react-router";
import { AdminIdentitySetup } from "@/routes/admin/account-setup";
export const Route = createFileRoute("/master-distributor/account-setup")({
  component: AdminIdentitySetup,
});
