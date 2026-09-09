import { createFileRoute } from "@tanstack/react-router";
import { Route as SharedBankRoute } from "@/routes/retailer/bank";

function BankPage() {
  const Component = SharedBankRoute.options.component;
  return Component ? <Component /> : null;
}
export const Route = createFileRoute("/admin/profile/bank")({ component: BankPage });
