import { createFileRoute } from "@tanstack/react-router";
import { AepsWorkspace } from "@/components/aeps-workspace";

export const Route = createFileRoute("/retailer/aeps/")({
  validateSearch: (search: Record<string, unknown>) => ({
    service: typeof search.service === "string" ? search.service : undefined,
  }),
  head: () => ({ meta: [{ title: "AEPS — UMOBIPAY" }] }),
  component: RetailerAepsPage,
});

const serviceCodes = {
  "balance-enquiry": "BE",
  "mini-statement": "MS",
  "cash-withdrawal": "CW",
  "aadhaar-pay": "AP",
  "cash-deposit": "CD",
} as const;

function RetailerAepsPage() {
  const { service } = Route.useSearch();
  const requestedService = serviceCodes[service as keyof typeof serviceCodes];
  return <AepsWorkspace requestedService={requestedService} />;
}
