import { createFileRoute } from "@tanstack/react-router";
import { CreateMemberPage } from "@/routes/admin/merchants";
export const Route = createFileRoute("/distributor/retailers/add/")({
  component: CreateMemberPage,
});
