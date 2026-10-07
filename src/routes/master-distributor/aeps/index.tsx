import { createFileRoute } from "@tanstack/react-router";
import { AepsWorkspace } from "@/components/aeps-workspace";

export const Route = createFileRoute("/master-distributor/aeps/")({
  head: () => ({ meta: [{ title: "AEPS — UMOBIPAY" }] }),
  component: AepsWorkspace,
});
