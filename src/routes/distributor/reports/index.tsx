import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminLayout, AdminPanel } from "@/components/admin/admin-layout";
import { distributorApi } from "@/lib/distributor-api";
import type { AuditPage } from "@/lib/operations-api";
export const Route = createFileRoute("/distributor/reports/")({ component: ReportsPage });
function ReportsPage() {
  const [data, setData] = useState<AuditPage | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    distributorApi
      .audits()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Reports unavailable."));
  }, []);
  return (
    <AdminLayout
      active="reports"
      eyebrow="Reports"
      title="Account activity report"
      description="Authenticated Distributor audit activity from the live backend."
    >
      <AdminPanel>
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
              {data?.data.map((row) => (
                <tr key={row.id} className="border-b border-border/60">
                  <td className="p-3">{new Date(row.createdAt).toLocaleString("en-IN")}</td>
                  <td className="p-3">{row.service}</td>
                  <td className="p-3 font-bold">{row.action}</td>
                  <td className="p-3">{row.status}</td>
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
