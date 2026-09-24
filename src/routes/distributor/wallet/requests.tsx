import { createFileRoute } from "@tanstack/react-router";
import { FundRequestsPage } from "@/routes/retailer/wallet/requests";

export const Route = createFileRoute("/distributor/wallet/requests")({
  component: FundRequestsPage,
});
