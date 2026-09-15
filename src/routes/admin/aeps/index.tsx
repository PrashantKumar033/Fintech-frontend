import { createFileRoute, Link } from "@tanstack/react-router";
import { Fingerprint, Settings2, Users } from "lucide-react";

import { AdminLayout, AdminPanel } from "@/components/admin/admin-layout";
import { AepsWorkspace } from "@/components/aeps-workspace";
import { getAdminActor } from "@/lib/admin-api";

export const Route = createFileRoute("/admin/aeps/")({
  component: AdminAepsPage,
});

function AdminAepsPage() {
  // Identity ADMIN accounts can onboard and transact for themselves. The
  // dedicated Super Admin account remains an oversight/control identity and
  // therefore sees management tools instead of a merchant registration form.
  if (getAdminActor()?.kind === "IDENTITY_ADMIN") return <AepsWorkspace />;

  const actions = [
    {
      title: "AEPS merchants",
      description: "Review merchant onboarding and update or synchronize merchant status.",
      to: "/admin/merchants/list",
      icon: Users,
    },
    {
      title: "AEPS transactions",
      description: "Monitor provider transactions, reconciliation and reversals.",
      to: "/admin/transactions",
      icon: Fingerprint,
    },
    {
      title: "Provider controls",
      description: "Check VimoPay availability and control individual AEPS operations.",
      to: "/admin/api-settings",
      icon: Settings2,
    },
  ] as const;

  return (
    <AdminLayout
      active="aeps"
      eyebrow="Assisted banking"
      title="AEPS management"
      description="Monitor merchants and transactions, reconcile provider activity and manage VimoPay service availability."
    >
      <div className="grid gap-4 md:grid-cols-3">
        {actions.map(({ title, description, to, icon: Icon }) => (
          <Link key={title} to={to} className="block cursor-pointer">
            <AdminPanel className="h-full transition hover:border-primary hover:shadow-md">
              <Icon className="text-primary" />
              <h2 className="mt-4 text-lg font-black">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
            </AdminPanel>
          </Link>
        ))}
      </div>
    </AdminLayout>
  );
}
