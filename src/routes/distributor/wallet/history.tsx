import { createFileRoute } from "@tanstack/react-router";
import { RoleWalletHistoryPage } from "@/routes/master-distributor/wallet/history";

export const Route = createFileRoute("/distributor/wallet/history")({
  component: RoleWalletHistoryPage,
});
