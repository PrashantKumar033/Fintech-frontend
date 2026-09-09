import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Network, UserPlus } from "lucide-react";
import { AdminLayout, AdminPanel } from "@/components/admin/admin-layout";
import { getSession } from "@/lib/auth-api";
import { masterDistributorApi } from "@/lib/master-distributor-api";
import type { HierarchyChild } from "@/lib/distributor-api";
export const Route = createFileRoute("/master-distributor/network/distributors/")({
  component: Distributors,
});
function Distributors() {
  const s = getSession(),
    [rows, setRows] = useState<HierarchyChild[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    if (s)
      masterDistributorApi
        .distributors(s.identity.id)
        .then((v) => setRows(Array.isArray(v) ? v : []))
        .catch((e) => setError(e instanceof Error ? e.message : "Network unavailable."));
  }, [s?.identity.id]);
  return (
    <AdminLayout
      active="merchants"
      eyebrow="Network"
      title="Distributor management"
      description="View and create direct Distributors under this Master Distributor."
    >
      <div className="mb-5 flex justify-end">
        <a
          href="/master-distributor/network/distributors/add"
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white"
        >
          <UserPlus size={17} />
          Add Distributor
        </a>
      </div>
      <AdminPanel>
        {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="space-y-3">
          {rows.map((r, i) => (
            <div
              key={r.id || i}
              className="flex items-center gap-3 rounded-xl border border-border p-4"
            >
              <Network className="text-primary" />
              <div>
                <p className="text-sm font-black">{r.childUserId || r.id}</p>
                <p className="text-xs text-muted-foreground">{r.serviceType || "All services"}</p>
              </div>
              <span className="ml-auto text-xs font-bold">
                {r.isActive === false ? "INACTIVE" : "ACTIVE"}
              </span>
            </div>
          ))}
          {!rows.length && !error && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No direct Distributor hierarchy records found.
            </p>
          )}
        </div>
        <p className="mt-5 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
          Full profile, KYC, wallet and Retailer count require protected child-detail aggregation
          APIs.
        </p>
      </AdminPanel>
    </AdminLayout>
  );
}
