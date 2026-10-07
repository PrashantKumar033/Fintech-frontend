import { createFileRoute } from "@tanstack/react-router";
import { NetworkAepsTransactions } from "@/components/network-aeps-transactions";

export const Route = createFileRoute("/distributor/aeps/balance-enquiry")({
  component: BalanceEnquiryMonitoring,
});

function BalanceEnquiryMonitoring() {
  return (
    <NetworkAepsTransactions
      activeArea="aeps"
      operation="BE"
      title="Balance enquiry monitoring"
      description="Review balance-enquiry transactions performed by your assigned Retailers."
    />
  );
}
