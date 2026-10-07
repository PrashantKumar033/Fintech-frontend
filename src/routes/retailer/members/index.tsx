import { createFileRoute } from "@tanstack/react-router";
import { AdminMemberListPage } from "@/features/admin/members/member-list-page";

export const Route = createFileRoute("/retailer/members/")({
  head: () => ({ meta: [{ title: "Member Management — UMOBIPAY" }] }),
  component: RetailerMembers,
});

function RetailerMembers() {
  return <AdminMemberListPage retailer />;
}
