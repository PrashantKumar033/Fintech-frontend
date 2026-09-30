import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/admin-layout";
import { PayoutSettlementWorkspace } from "@/components/payout-settlement-workspace";

export const Route = createFileRoute("/distributor/wallet/payout")({
  head: () => ({ meta: [{ title: "Payout to Bank — Distributor | UMOBIPAY" }] }),
  component: DistributorPayoutPage,
});

function DistributorPayoutPage() {
  return (
    <AdminLayout
      active="settlements"
      eyebrow="Payout service"
      title="Payout to bank"
      description="Settle AEPS or MAIN wallet funds to your approved payout-enabled bank account."
    >
      <PayoutSettlementWorkspace />
    </AdminLayout>
  );
}
