import { createFileRoute } from "@tanstack/react-router";
import { FundRequestsPage } from "@/routes/retailer/wallet/requests";
export const Route = createFileRoute("/master-distributor/wallet/requests")({ component: Page });
function Page() {
  return <FundRequestsPage />;
}
