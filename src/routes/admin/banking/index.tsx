import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout, ServiceState } from "@/components/admin/admin-layout";
export const Route = createFileRoute("/admin/banking/")({ component: Banking });
function Banking() { return <AdminLayout active="banking" eyebrow="Bank service" title="Bank operations" description="Bank verification and administration remain isolated from retailer banking screens."><ServiceState title="Bank verification queue" description="The current Super Admin gateway does not expose a bank-review endpoint. This module is ready to connect without using retailer APIs or fabricated data." status="Admin API pending" /></AdminLayout>; }
