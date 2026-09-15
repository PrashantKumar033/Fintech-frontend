import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Eye, FileClock, RefreshCw } from "lucide-react";
import { AuditDetailDialog } from "@/components/audit-detail-dialog";
import { BusinessPage, ServiceNotice } from "@/components/business-page";
import { getSession } from "@/lib/auth-api";
import { operationsApi, operationsMessage, type AuditPage } from "@/lib/operations-api";

type ActivityView = "account" | "aeps" | "wallet" | "commission";

const activityViews: Record<
  ActivityView,
  { heading: string; description: string; empty: string; service?: string }
> = {
  account: {
    heading: "Security & service activity",
    description: "Latest 50 audit events",
    empty: "No account activity found.",
  },
  aeps: {
    heading: "AEPS activity",
    description: "Latest AEPS onboarding and transaction events",
    empty: "No AEPS activity found.",
    service: "AEPS",
  },
  wallet: {
    heading: "Wallet activity",
    description: "Latest wallet balance and transfer events",
    empty: "No wallet activity found.",
    service: "WALLET",
  },
  commission: {
    heading: "Commission activity",
    description: "Latest commission calculation and settlement events",
    empty: "No commission activity found.",
    service: "COMMISSION",
  },
};

export const Route = createFileRoute("/activity")({
  validateSearch: (search: Record<string, unknown>) => ({
    view:
      search.view === "aeps" || search.view === "wallet" || search.view === "commission"
        ? search.view
        : undefined,
  }),
  head: () => ({ meta: [{ title: "Account Activity — UMOBIPAY" }] }),
  component: ActivityPage,
});

function ActivityPage() {
  const { view: routeView } = Route.useSearch();
  const view: ActivityView = routeView ?? "account";
  const viewConfig = activityViews[view];
  const navigate = useNavigate();
  const [session, setSession] = useState<ReturnType<typeof getSession>>(null);
  const [logs, setLogs] = useState<AuditPage | null>(null);
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
  const [status, setStatus] = useState<"" | "SUCCESS" | "FAILED">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async (token: string, selected: typeof status, selectedView: ActivityView) => {
      setLoading(true);
      setError("");
      try {
        setLogs(
          await operationsApi.audits(token, {
            page: 1,
            limit: 50,
            status: selected || undefined,
            service: activityViews[selectedView].service,
          }),
        );
      } catch (value) {
        setError(operationsMessage(value));
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const value = getSession();
    if (!value) {
      void navigate({ to: "/login" });
      return;
    }
    setSession(value);
  }, [navigate]);

  useEffect(() => {
    if (!session) return;
    setSelectedAuditId(null);
    void load(session.accessToken, status, view);
  }, [load, session, status, view]);

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
            <h2 className="font-extrabold text-secondary">{viewConfig.heading}</h2>
            <p className="text-xs text-muted-foreground">{viewConfig.description}</p>
          </div>
          <select
            value={status}
            onChange={(event) => {
              const value = event.target.value as typeof status;
              setStatus(value);
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
            {viewConfig.empty}
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
