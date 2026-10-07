import { createFileRoute } from "@tanstack/react-router";
import { Headphones } from "lucide-react";
import { DistributorModulePlaceholder } from "@/components/distributor/module-placeholder";
export const Route = createFileRoute("/distributor/support/")({
  component: () => (
    <DistributorModulePlaceholder
      active="sms"
      icon={Headphones}
      title="Support & complaints"
      description="Track support requests and operational complaints from one dedicated workspace."
    />
  ),
});
