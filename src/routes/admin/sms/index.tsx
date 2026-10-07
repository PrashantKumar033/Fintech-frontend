import { createFileRoute } from "@tanstack/react-router";
import { Cable, LayoutTemplate, Tags } from "lucide-react";
import { AdminLayout } from "@/components/admin/admin-layout";
import { AdminFeatureGrid } from "@/components/admin/admin-feature-grid";
export const Route = createFileRoute("/admin/sms/")({ component: Sms });
function Sms() { return <AdminLayout active="sms" eyebrow="Communication" title="SMS settings" description="Configure transactional message categories, templates and provider integrations."><AdminFeatureGrid features={[{title:"SMS categories",description:"Organize login, transaction and operational messages.",icon:Tags},{title:"SMS templates",description:"Manage approved message bodies and template identifiers.",icon:LayoutTemplate},{title:"SMS integrations",description:"Configure provider credentials, routing and delivery settings.",icon:Cable}]} /></AdminLayout>; }
