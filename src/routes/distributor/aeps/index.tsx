import { createFileRoute } from "@tanstack/react-router";
import { AepsWorkspace } from "@/components/aeps-workspace";

export const Route = createFileRoute("/distributor/aeps/")({
  head: () => ({ meta: [{ title: "AEPS — UMOBIPAY" }] }),
  component: AepsWorkspace,
});
