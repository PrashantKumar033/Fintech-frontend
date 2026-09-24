import { createFileRoute } from "@tanstack/react-router";
import { IdentityFinancialReport } from "@/components/identity-financial-report";

export const Route = createFileRoute("/retailer/reports/")({
  component: IdentityFinancialReport,
});
