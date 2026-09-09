import { createFileRoute } from "@tanstack/react-router";
import { DistributorDashboard } from "./dashboard";

export const Route = createFileRoute("/distributor/")({
  head: () => ({ meta: [{ title: "Distributor Dashboard — UMOBIPAY" }] }),
  component: DistributorDashboard,
});
