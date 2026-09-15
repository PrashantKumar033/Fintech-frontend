import { createFileRoute } from "@tanstack/react-router";
import { NetworkAepsTransactions } from "@/components/network-aeps-transactions";

export const Route = createFileRoute("/distributor/aeps/mini-statement")({
  component: MiniStatementMonitoring,
});

function MiniStatementMonitoring() {
  return (
    <NetworkAepsTransactions
      activeArea="aeps"
      operation="MS"
      title="Mini statement monitoring"
      description="Review mini-statement transactions performed by your assigned Retailers."
    />
  );
}
