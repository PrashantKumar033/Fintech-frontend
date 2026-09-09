import { createFileRoute } from "@tanstack/react-router";
import { FileCheck2, LockKeyhole, RefreshCcw, ShieldAlert } from "lucide-react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { AdminFeatureGrid } from "@/components/admin/admin-feature-grid";
export const Route = createFileRoute("/admin/legal/")({ component: Legal });
function Legal() { return <AdminLayout active="legal" eyebrow="Content governance" title="Legal documents" description="Manage customer-facing policy content with a controlled publication workflow."><AdminFeatureGrid features={[{title:"Terms & conditions",description:"Draft and publish platform terms and conditions.",icon:FileCheck2},{title:"Privacy policy",description:"Maintain privacy, data-use and consent documentation.",icon:LockKeyhole},{title:"Refund policy",description:"Manage refund and cancellation policy content.",icon:RefreshCcw},{title:"Security tips",description:"Publish account and transaction security guidance.",icon:ShieldAlert}]} /></AdminLayout>; }
