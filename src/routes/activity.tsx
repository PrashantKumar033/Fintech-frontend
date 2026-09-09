import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Eye, FileClock, RefreshCw } from "lucide-react";
import { AuditDetailDialog } from "@/components/audit-detail-dialog";
import { BusinessPage, ServiceNotice } from "@/components/business-page";
import { getSession } from "@/lib/auth-api";
import { operationsApi, operationsMessage, type AuditPage } from "@/lib/operations-api";

export const Route = createFileRoute("/activity")({
  head: () => ({ meta: [{ title: "Account Activity — UMOBIPAY" }] }),
  component: ActivityPage,
});

function ActivityPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<ReturnType<typeof getSession>>(null);
  const [logs, setLogs] = useState<AuditPage | null>(null);
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
  const [status, setStatus] = useState<"" | "SUCCESS" | "FAILED">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(token: string, selected = status) {
    setLoading(true);
    setError("");
    try {
      setLogs(
        await operationsApi.audits(token, {
          page: 1,
          limit: 50,
          status: selected || undefined,
        }),
      );
    } catch (value) {
      setError(operationsMessage(value));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const value = getSession();
    if (!value) {
      void navigate({ to: "/login" });
      return;
    }
    setSession(value);
    void load(value.accessToken, "");
  }, [navigate]);

  const loadAuditDetail = useCallback(
    (auditId: string) => {
      if (!session) return Promise.reject(new Error("Your session is no longer available."));
      return operationsApi.audit(session.accessToken, auditId);
    },
    [session],
  );

  if (!session) {
    return (
      <div className="grid min-h-screen place-items-center">
        <RefreshCw className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <BusinessPage
      identity={session.identity}
      active="reports"
      eyebrow="Audit service"
      title="Account activity"
      description="A secure record of actions performed through your UMOBIPAY account."
    >
      {error && (
        <div className="mb-5">
          <ServiceNotice ok={false}>{error}</ServiceNotice>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
          <div>
            <h2 className="font-extrabold text-secondary">Security & service activity</h2>
            <p className="text-xs text-muted-foreground">Latest 50 audit events</p>
          </div>
          <select
            value={status}
            onChange={(event) => {
              const value = event.target.value as typeof status;
              setStatus(value);
              void load(session.accessToken, value);
            }}
            className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
          >
            <option value="">All events</option>
            <option value="SUCCESS">Successful</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>

        {loading ? (
          <div className="grid h-64 place-items-center">
            <RefreshCw className="animate-spin text-primary" />
          </div>
        ) : logs?.data.length ? (
          <div className="divide-y divide-border">
            {logs.data.map((log) => (
              <article key={log.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                    log.status === "SUCCESS"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-red-50 text-red-600"
                  }`}
                >
                  <FileClock size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-secondary">{log.action.replaceAll("_", " ")}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {log.service} · {log.httpMethod || "EVENT"} {log.endpoint || ""}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <div className="sm:text-right">
                    <span
                      className={`text-xs font-extrabold ${
                        log.status === "SUCCESS" ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {log.status}
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <button
                    type="button"
                    title="View activity detail"
                    aria-label={`View details for ${log.action}`}
                    onClick={() => setSelectedAuditId(log.id)}
                    className="rounded-xl border border-border p-2.5 text-secondary hover:border-primary hover:text-primary"
                  >
                    <Eye size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="grid h-64 place-items-center text-sm text-muted-foreground">
            No audit activity found.
          </div>
        )}
      </section>

      {selectedAuditId && (
        <AuditDetailDialog
          auditId={selectedAuditId}
          loadAudit={loadAuditDetail}
          onClose={() => setSelectedAuditId(null)}
        />
      )}
    </BusinessPage>
  );
}
