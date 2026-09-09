import type { LucideIcon } from "lucide-react";
import { AdminLayout, AdminPanel } from "@/components/admin/admin-layout";
import type { AdminArea } from "@/components/admin/admin-sidebar";

export function MasterDistributorModulePlaceholder({ active, icon: Icon, title, description, pending }: { active: AdminArea; icon: LucideIcon; title: string; description: string; pending: string }) {
  return <AdminLayout active={active} eyebrow="Master Distributor service" title={title} description={description}><AdminPanel><span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary"><Icon /></span><h2 className="mt-5 text-xl font-black">Frontend module ready</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{pending}</p><span className="mt-5 inline-flex rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">Backend contract pending</span></AdminPanel></AdminLayout>;
}
