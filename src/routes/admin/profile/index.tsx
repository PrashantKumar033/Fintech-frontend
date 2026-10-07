import { createFileRoute } from "@tanstack/react-router";
import { AdminProfilePage } from "@/components/admin/admin-profile-page";

export const Route = createFileRoute("/admin/profile/")({
  component: AdminProfilePage,
});
