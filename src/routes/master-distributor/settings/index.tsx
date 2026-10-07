import { createFileRoute } from "@tanstack/react-router";
import { AdminSettingsPage } from "@/components/admin/admin-settings-page";
export const Route = createFileRoute("/master-distributor/settings/")({
  component: AdminSettingsPage,
});
