import { createFileRoute } from "@tanstack/react-router";
import { AdminMemberListPage } from "@/features/admin/members/member-list-page";

export const Route = createFileRoute("/admin/merchants/list/")({
  component: AdminMemberListPage,
});
