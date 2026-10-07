import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, CheckCircle2, Clock3 } from "lucide-react";
import { AdminPanel } from "./admin-layout";

export type AdminFeature = { title: string; description: string; icon: LucideIcon; available?: boolean };

export function AdminFeatureGrid({ features }: { features: AdminFeature[] }) {
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{features.map(({ title, description, icon: Icon, available }) => <AdminPanel key={title} className="group"><div className="flex items-start justify-between"><span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><Icon size={20} /></span><span className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-extrabold ${available ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{available ? <CheckCircle2 size={12} /> : <Clock3 size={12} />}{available ? "API READY" : "PLANNED"}</span></div><h2 className="mt-5 text-lg font-black">{title}</h2><p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">{description}</p><div className="mt-4 flex items-center gap-1 text-xs font-extrabold text-primary">{available ? "Open workflow" : "Backend contract required"}<ArrowUpRight size={14} /></div></AdminPanel>)}</div>;
}
