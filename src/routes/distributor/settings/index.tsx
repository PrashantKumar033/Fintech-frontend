import { createFileRoute } from "@tanstack/react-router";
import { AdminSettings } from "@/routes/admin/settings";
export const Route = createFileRoute("/distributor/settings/")({ component: AdminSettings });
