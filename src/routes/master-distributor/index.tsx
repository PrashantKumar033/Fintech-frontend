import { createFileRoute } from "@tanstack/react-router";
import { MasterDashboard } from "./dashboard";

export const Route = createFileRoute("/master-distributor/")({
  head: () => ({ meta: [{ title: "Master Distributor Dashboard — UMOBIPAY" }] }),
  component: MasterDashboard,
});
