import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { DistributorModulePlaceholder } from "@/components/distributor/module-placeholder";
export const Route = createFileRoute("/distributor/aeps/mini-statement")({
  component: () => (
    <DistributorModulePlaceholder
      active="transactions"
      icon={FileText}
      title="Mini statement monitoring"
      description="Review-focused Distributor workspace for mini-statement activity."
    />
  ),
});
