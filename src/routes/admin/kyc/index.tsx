import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout, ServiceState } from "@/components/admin/admin-layout";
export const Route = createFileRoute("/admin/kyc/")({ component: Kyc });
function Kyc() { return <AdminLayout active="kyc" eyebrow="Compliance" title="KYC approvals" description="A dedicated administration area for compliance review and approval history."><ServiceState title="Compliance review queue" description="The current Super Admin gateway does not expose KYC approval routes. The screen is separated and ready for the verified admin contract when available." status="Admin API pending" /></AdminLayout>; }
