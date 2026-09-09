import { createFileRoute } from "@tanstack/react-router";
import { Banknote } from "lucide-react";
import { DistributorModulePlaceholder } from "@/components/distributor/module-placeholder";
export const Route = createFileRoute("/distributor/aeps/cash-withdrawal")({
  component: () => (
    <DistributorModulePlaceholder
      active="transactions"
      icon={Banknote}
      title="Cash withdrawal monitoring"
      description="Review-focused Distributor workspace for cash-withdrawal activity."
    />
  ),
});
