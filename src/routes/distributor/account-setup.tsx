import { createFileRoute } from "@tanstack/react-router";
import { AdminIdentitySetup } from "@/routes/admin/account-setup";
export const Route = createFileRoute("/distributor/account-setup")({
  component: AdminIdentitySetup,
});
