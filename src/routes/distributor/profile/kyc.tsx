import { createFileRoute } from "@tanstack/react-router";
import { Route as SharedKycRoute } from "@/routes/retailer/kyc";

function KycPage() {
  const Component = SharedKycRoute.options.component;
  return Component ? <Component /> : null;
}
export const Route = createFileRoute("/distributor/profile/kyc")({ component: KycPage });
