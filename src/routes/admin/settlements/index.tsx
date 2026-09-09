import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout, ServiceState } from "@/components/admin/admin-layout";
export const Route = createFileRoute("/admin/settlements/")({ component: Settlements });
function Settlements() { return <AdminLayout active="settlements" eyebrow="Wallet operations" title="Settlements" description="Settlement operations have their own scalable module boundary."><ServiceState title="Settlement workspace" description="Settlement batches and controls will be connected to the transaction and wallet admin contracts when those endpoints are exposed." status="Backend contract pending" /></AdminLayout>; }
