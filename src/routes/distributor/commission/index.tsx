import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { IndianRupee } from "lucide-react";
import { AdminLayout, AdminPanel } from "@/components/admin/admin-layout";
import { distributorApi } from "@/lib/distributor-api";
import { asArray } from "@/lib/admin-api";
export const Route = createFileRoute("/distributor/commission/")({ component: CommissionPage });
function CommissionPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    distributorApi
      .commissions()
      .then((value) => setRows(asArray<Record<string, unknown>>(value)))
      .catch((e) => setError(e instanceof Error ? e.message : "Commission data unavailable."));
  }, []);
  return (
    <AdminLayout
      active="commissions"
      eyebrow="Earnings"
      title="Commission history"
      description="Configured commission distributions available from the current backend."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <AdminPanel>
          <IndianRupee className="text-primary" />
          <p className="mt-4 text-xs font-bold uppercase text-muted-foreground">
            Distribution records
          </p>
          <p className="mt-1 text-3xl font-black">{rows.length}</p>
        </AdminPanel>
        <AdminPanel>
          <p className="text-sm font-black">Daily earnings</p>
          <p className="mt-3 text-sm text-muted-foreground">
            Dedicated earning-ledger API pending.
          </p>
        </AdminPanel>
        <AdminPanel>
          <p className="text-sm font-black">Monthly earnings</p>
          <p className="mt-3 text-sm text-muted-foreground">
            Dedicated earning-ledger API pending.
          </p>
        </AdminPanel>
      </div>
      {error && <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{error}</p>}
      <AdminPanel className="mt-5">
        <h2 className="text-xl font-black">Commission records</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Transaction-wise earned, pending and settled history requires a protected
          commission-ledger endpoint. No demo earnings are shown.
        </p>
      </AdminPanel>
    </AdminLayout>
  );
}
