import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/admin-layout";
import { AdminTransactionOperations } from "@/components/admin/admin-transaction-operations";
import { WalletFundingOperations } from "@/components/admin/wallet-funding-operations";
import { WalletFinancialControls } from "@/components/admin/wallet-financial-controls";
import { AdminPayoutOperations } from "@/components/admin/admin-payout-operations";
export const Route = createFileRoute("/admin/settlements/")({ component: Settlements });
function Settlements() {
  return (
    <AdminLayout
      active="settlements"
      eyebrow="Wallet operations"
      title="Wallet & settlements"
      description="Operate wallets, payout settlements, reconciliation, provider income and authorized reversals."
    >
      <WalletFinancialControls />
      <WalletFundingOperations />
      <AdminPayoutOperations />
      <AdminTransactionOperations />
    </AdminLayout>
  );
}
