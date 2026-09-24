import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/admin-layout";
import { AdminTransactionOperations } from "@/components/admin/admin-transaction-operations";
import { WalletFundingOperations } from "@/components/admin/wallet-funding-operations";
import { WalletFinancialControls } from "@/components/admin/wallet-financial-controls";
export const Route = createFileRoute("/admin/settlements/")({ component: Settlements });
function Settlements() {
  return (
    <AdminLayout
      active="settlements"
      eyebrow="Wallet operations"
      title="Wallet & settlements"
      description="Monitor transaction settlement, reconcile provider income and process authorized reversals."
    >
      <WalletFinancialControls />
      <WalletFundingOperations />
      <AdminTransactionOperations />
    </AdminLayout>
  );
}
