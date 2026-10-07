import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Eye, Loader2, RefreshCw, Search } from "lucide-react";
import { AuditDetailDialog } from "@/components/audit-detail-dialog";
import { AdminLayout, AdminPanel } from "@/components/admin/admin-layout";
import { IdentityFinancialReport } from "@/components/identity-financial-report";
import { adminApi, getAdminActor, type AuditLog } from "@/lib/admin-api";
import { getSession } from "@/lib/auth-api";
import { useEffectiveAccess } from "@/hooks/use-effective-access";
import { UI_PERMISSION } from "@/lib/ui-permissions";

export const Route = createFileRoute("/admin/reports/")({ component: Reports });

const inputClass =
  "rounded-xl border border-border bg-white px-3.5 py-3 text-xs outline-none focus:border-primary";

type ReportView = "financial" | "audit";

function when(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function Reports() {
  const actor = getAdminActor();
  const { can } = useEffectiveAccess();
  const dedicatedSuperAdmin = actor?.kind === "SUPER_ADMIN";
  const hasFinancialReport =
    Boolean(getSession()) &&
    can(UI_PERMISSION.WALLET_TRANSACTION_VIEW, [
      "ADMIN",
      "MASTER_DISTRIBUTOR",
      "DISTRIBUTOR",
      "RETAILER",
    ]);
  // The backend currently scopes /audit to the dedicated SUPER_ADMIN in
  // addition to requiring AUDIT.ALL.LIST.
  const canViewAudit = dedicatedSuperAdmin;
  const [view, setView] = useState<ReportView>(() =>
    getAdminActor()?.kind === "SUPER_ADMIN" ? "audit" : "financial",
  );
  const [items, setItems] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
  const [service, setService] = useState("");
  const [action, setAction] = useState("");
  const [status, setStatus] = useState("");
  const [loginId, setLoginId] = useState("");

  async function load(target = page) {
    if (!canViewAudit) return;
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ page: String(target), limit: "25" });
      if (service.trim()) query.set("service", service.trim().toUpperCase());
      if (action.trim()) query.set("action", action.trim().toUpperCase());
      if (status) query.set("status", status);
      if (loginId.trim()) query.set("loginId", loginId.trim());
      const result = await adminApi.auditLogs(query.toString());
      setItems(result.data || []);
      setPage(result.pagination?.page || target);
      setTotalPages(Math.max(result.pagination?.totalPages || 1, 1));
      setTotal(result.pagination?.total || 0);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to load audit logs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (view === "audit" && canViewAudit) void load(1);
    // Filters are applied explicitly through the Apply button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, canViewAudit]);

  useEffect(() => {
    if (view === "financial" && !hasFinancialReport && canViewAudit) setView("audit");
    if (view === "audit" && !canViewAudit && hasFinancialReport) setView("financial");
  }, [canViewAudit, hasFinancialReport, view]);

  const loadAuditDetail = useCallback((auditId: string) => adminApi.auditLog(auditId), []);

  function filter(event: FormEvent) {
    event.preventDefault();
    void load(1);
  }

  return (
    <AdminLayout
      active="reports"
      eyebrow="Operations intelligence"
      title="Reports"
      description="Review financial movement and security activity from one reporting workspace."
    >
      <div className="mb-5 overflow-x-auto rounded-2xl border border-border bg-white p-2 shadow-sm">
        <div className="flex min-w-max gap-2">
          {hasFinancialReport ? (
            <button
              type="button"
              onClick={() => setView("financial")}
              className={`rounded-xl px-5 py-3 text-sm font-extrabold transition ${
                view === "financial"
                  ? "bg-primary text-white shadow-sm"
                  : "text-secondary hover:bg-muted"
              }`}
            >
              Financial report
            </button>
          ) : null}
          {canViewAudit ? (
            <button
              type="button"
              onClick={() => setView("audit")}
              className={`rounded-xl px-5 py-3 text-sm font-extrabold transition ${
                view === "audit"
                  ? "bg-primary text-white shadow-sm"
                  : "text-secondary hover:bg-muted"
              }`}
            >
              Audit trail
            </button>
          ) : null}
        </div>
      </div>

      {view === "financial" && hasFinancialReport ? (
        <IdentityFinancialReport embedded />
      ) : view === "audit" && canViewAudit ? (
        <AdminPanel>
          <div className="mb-5">
            <p className="text-xs font-extrabold uppercase tracking-wider text-primary">
              Security observability
            </p>
            <h2 className="mt-1 text-xl font-black text-secondary">Audit logs</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Review successful and failed operations with identity, service, action and resource
              context.
            </p>
          </div>
          <form onSubmit={filter} className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_160px_auto]">
            <label className="flex items-center gap-2 rounded-xl border border-border bg-white px-3">
              <Search size={14} />
              <input
                value={loginId}
                onChange={(event) => setLoginId(event.target.value)}
                placeholder="Login ID"
                className="min-w-0 flex-1 py-3 text-xs outline-none"
              />
            </label>
            <input
              value={service}
              onChange={(event) => setService(event.target.value)}
              placeholder="Service"
              className={inputClass}
            />
            <input
              value={action}
              onChange={(event) => setAction(event.target.value)}
              placeholder="Action"
              className={inputClass}
            />
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className={inputClass}
            >
              <option value="">All statuses</option>
              <option>SUCCESS</option>
              <option>FAILED</option>
            </select>
            <button
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-extrabold text-white"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Apply
            </button>
          </form>

          {error && (
            <p
              role="alert"
              className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700"
            >
              {error}
            </p>
          )}

          <div className="mt-5 overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="bg-muted/60 text-[10px] uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Time</th>
                  <th className="p-3">Identity</th>
                  <th className="p-3">Service</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Request</th>
                  <th className="p-3">Status</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((log) => (
                  <tr key={log.id} className="border-t border-border/70">
                    <td className="whitespace-nowrap p-3">{when(log.createdAt)}</td>
                    <td className="p-3">
                      <p className="font-black">{log.loginId || "System"}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {log.role || log.identityId || "—"}
                      </p>
                    </td>
                    <td className="p-3 font-bold">{log.service || "—"}</td>
                    <td className="p-3 font-bold">{log.action || "—"}</td>
                    <td className="p-3">
                      <p className="font-bold">{log.httpMethod || "EVENT"}</p>
                      <p className="max-w-[190px] truncate text-[10px] text-muted-foreground">
                        {log.endpoint || "—"}
                      </p>
                    </td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-2 py-1 text-[9px] font-extrabold ${
                          log.status === "FAILED"
                            ? "bg-red-50 text-red-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {log.status || "UNKNOWN"}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedAuditId(log.id)}
                        title="View audit detail"
                        className="rounded-lg border border-border p-2"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {loading && (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 size={17} className="animate-spin" />
                Loading audit trail…
              </div>
            )}
            {!loading && !items.length && (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No audit events match these filters.
              </p>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {total} events · Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => void load(page - 1)}
                className="rounded-lg border border-border px-3 py-2 font-bold disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => void load(page + 1)}
                className="rounded-lg border border-border px-3 py-2 font-bold disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </AdminPanel>
      ) : null}

      {view === "audit" && canViewAudit && selectedAuditId && (
        <AuditDetailDialog
          auditId={selectedAuditId}
          loadAudit={loadAuditDetail}
          onClose={() => setSelectedAuditId(null)}
        />
      )}
    </AdminLayout>
  );
}
