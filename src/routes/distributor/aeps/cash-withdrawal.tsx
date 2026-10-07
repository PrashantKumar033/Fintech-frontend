import { createFileRoute } from "@tanstack/react-router";
import { NetworkAepsTransactions } from "@/components/network-aeps-transactions";

export const Route = createFileRoute("/distributor/aeps/cash-withdrawal")({
  component: CashWithdrawalMonitoring,
});

function CashWithdrawalMonitoring() {
  return (
    <NetworkAepsTransactions
      activeArea="aeps"
      operation="CW"
      title="Cash withdrawal monitoring"
      description="Review cash-withdrawal transactions performed by your assigned Retailers."
    />
  );
}
