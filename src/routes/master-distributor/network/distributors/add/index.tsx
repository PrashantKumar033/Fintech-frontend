import { createFileRoute } from "@tanstack/react-router";
import { CreateMemberPage } from "@/routes/admin/merchants";
export const Route = createFileRoute("/master-distributor/network/distributors/add/")({
  component: CreateMemberPage,
});
