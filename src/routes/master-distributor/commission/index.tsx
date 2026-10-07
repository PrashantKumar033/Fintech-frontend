import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { IndianRupee } from "lucide-react";
import { AdminLayout, AdminPanel } from "@/components/admin/admin-layout";
import { masterDistributorApi } from "@/lib/master-distributor-api";
import { asArray } from "@/lib/admin-api";
export const Route = createFileRoute("/master-distributor/commission/")({ component: Page });
function Page() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    masterDistributorApi
      .commissions()
      .then((v) => setRows(asArray<Record<string, unknown>>(v)))
      .catch((e) => setError(e instanceof Error ? e.message : "Commission unavailable."));
  }, []);
  return (
    <AdminLayout
      active="commissions"
      eyebrow="Earnings"
      title="Commission overview"
      description="Available commission distribution records for the authenticated scope."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <AdminPanel>
          <IndianRupee className="text-primary" />
          <p className="mt-4 text-xs font-bold uppercase text-muted-foreground">
            Distribution records
          </p>
          <p className="text-3xl font-black">{rows.length}</p>
        </AdminPanel>
        <AdminPanel>
          <p className="font-black">Earned commission</p>
          <p className="mt-2 text-sm text-muted-foreground">Earnings ledger API pending.</p>
        </AdminPanel>
        <AdminPanel>
          <p className="font-black">Settlement status</p>
          <p className="mt-2 text-sm text-muted-foreground">Commission settlement API pending.</p>
        </AdminPanel>
      </div>
      {error && <p className="mt-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{error}</p>}
      <AdminPanel className="mt-5">
        <p className="text-sm text-muted-foreground">
          Global commission editing is intentionally unavailable to this role. Only
          backend-authorized configuration will be displayed.
        </p>
      </AdminPanel>
    </AdminLayout>
  );
}
