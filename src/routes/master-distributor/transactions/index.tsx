import { createFileRoute } from "@tanstack/react-router";
import { NetworkAepsTransactions } from "@/components/network-aeps-transactions";
import type { ProviderTransactionStatus } from "@/lib/operations-api";

const allowedStatuses = new Set<ProviderTransactionStatus>([
  "INITIATED",
  "PROCESSING",
  "SUCCESS",
  "FAILED",
  "PENDING",
  "UNKNOWN",
  "REVERSED",
]);

export const Route = createFileRoute("/master-distributor/transactions/")({
  validateSearch: (search: Record<string, unknown>) => ({
    status:
      typeof search.status === "string" &&
      allowedStatuses.has(search.status as ProviderTransactionStatus)
        ? (search.status as ProviderTransactionStatus)
        : undefined,
  }),
  component: MasterDistributorTransactions,
});

function MasterDistributorTransactions() {
  const { status } = Route.useSearch();
  return (
    <NetworkAepsTransactions
      activeArea="aeps"
      initialStatus={status ?? ""}
      title="Network AEPS transactions"
      description="Monitor AEPS activity across your assigned Distributors and their Retailer network."
    />
  );
}
