import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminLayout, AdminPanel } from "@/components/admin/admin-layout";
import { masterDistributorApi } from "@/lib/master-distributor-api";
import type { AuditPage } from "@/lib/operations-api";
export const Route = createFileRoute("/master-distributor/reports/")({ component: Page });
function Page() {
  const [data, setData] = useState<AuditPage | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    masterDistributorApi
      .audits()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Reports unavailable."));
  }, []);
  return (
    <AdminLayout
      active="reports"
      eyebrow="Reports"
      title="Account activity"
      description="Live audit activity for your authenticated account."
    >
      <AdminPanel>
        <p className="mb-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
          Downstream business and transaction reports require a scoped network-report API.
        </p>
        {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-3">Date</th>
                <th className="p-3">Service</th>
                <th className="p-3">Action</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.data.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="p-3">{new Date(r.createdAt).toLocaleString("en-IN")}</td>
                  <td className="p-3">{r.service}</td>
                  <td className="p-3 font-bold">{r.action}</td>
                  <td className="p-3">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data?.data.length && !error && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No activity records returned.
            </p>
          )}
        </div>
      </AdminPanel>
    </AdminLayout>
  );
}
