import { createFileRoute } from "@tanstack/react-router";
import { RoleWalletHoldsPage } from "@/routes/master-distributor/wallet/holds";

export const Route = createFileRoute("/distributor/wallet/holds")({
  component: RoleWalletHoldsPage,
});
