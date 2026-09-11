import { createFileRoute } from "@tanstack/react-router";
import { AdminBankOperationsPage } from "@/features/admin/banking/bank-operations-page";

export const Route = createFileRoute("/admin/banking/")({
  component: AdminBankOperationsPage,
});
