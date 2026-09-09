import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Store, UserPlus } from "lucide-react";
import { AdminLayout, AdminPanel } from "@/components/admin/admin-layout";
import { getSession } from "@/lib/auth-api";
import { distributorApi, type HierarchyChild } from "@/lib/distributor-api";

export const Route = createFileRoute("/distributor/retailers/")({ component: RetailersPage });
function RetailersPage() {
  const session = getSession();
  const [rows, setRows] = useState<HierarchyChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { if (session) distributorApi.retailers(session.identity.id).then(value => setRows(Array.isArray(value) ? value : [])).catch(reason => setError(reason instanceof Error ? reason.message : "Retailers could not be loaded.")).finally(() => setLoading(false)); }, [session?.identity.id]);
  return <AdminLayout active="merchants" eyebrow="Network" title="Retailer management" description="Create retailers and view the hierarchy records assigned below this Distributor."><div className="mb-5 flex justify-end"><a href="/distributor/retailers/add" className="flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white"><UserPlus size={17}/> Add retailer</a></div><AdminPanel>{error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead><tr className="border-b"><th className="p-3">Retailer identity</th><th className="p-3">Service</th><th className="p-3">Status</th><th className="p-3">Assigned</th></tr></thead><tbody>{rows.map((row,index) => <tr key={row.id || index} className="border-b border-border/60"><td className="p-3 font-bold"><span className="mr-2 inline-grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary"><Store size={15}/></span>{row.childUserId || row.id || "—"}</td><td className="p-3">{row.serviceType || "All services"}</td><td className="p-3 font-bold">{row.isActive === false ? "INACTIVE" : "ACTIVE"}</td><td className="p-3">{row.createdAt ? new Date(row.createdAt).toLocaleDateString("en-IN") : "—"}</td></tr>)}</tbody></table>{!loading && !rows.length && !error && <p className="py-12 text-center text-sm text-muted-foreground">No retailer hierarchy records found. Create the first Retailer account.</p>}{loading && <p className="py-12 text-center text-sm text-muted-foreground">Loading retailer network...</p>}</div><p className="mt-5 rounded-xl bg-muted p-3 text-xs text-muted-foreground">Full retailer profile, KYC and status controls will activate when the backend exposes protected child-identity detail endpoints.</p></AdminPanel></AdminLayout>;
}
