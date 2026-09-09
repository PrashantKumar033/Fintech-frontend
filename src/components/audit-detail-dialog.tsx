import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, X } from "lucide-react";

export type AuditDetailRecord = {
  id: string;
  eventId?: string;
  identityId?: string | null;
  sessionId?: string | null;
  loginId?: string | null;
  role?: string | null;
  service?: string;
  action?: string;
  status?: string;
  httpMethod?: string | null;
  endpoint?: string | null;
  statusCode?: number | null;
  ipAddress?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
};

type Props = {
  auditId: string;
  loadAudit: (auditId: string) => Promise<AuditDetailRecord>;
  onClose: () => void;
};

const label = (value: string) =>
  value
    .replace(/([A-Z])/g, " $1")
    .replaceAll("_", " ")
    .trim();

const time = (value?: string) => {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString("en-IN");
};

export function AuditDetailDialog({ auditId, loadAudit, onClose }: Props) {
  const [detail, setDetail] = useState<AuditDetailRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setDetail(null);
    setError("");
    setLoading(true);

    void loadAudit(auditId)
      .then((result) => {
        if (active) setDetail(result);
      })
      .catch((value: unknown) => {
        if (!active) return;
        setError(value instanceof Error ? value.message : "Unable to load audit detail.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [auditId, loadAudit]);

  const fields: Array<[string, string | number | null | undefined]> = detail
    ? [
        ["Event ID", detail.eventId],
        ["Login ID", detail.loginId],
        ["Role", detail.role],
        ["Service", detail.service],
        ["Action", detail.action],
        ["Status", detail.status],
        ["HTTP Method", detail.httpMethod],
        ["Endpoint", detail.endpoint],
        ["Status Code", detail.statusCode],
        ["IP Address", detail.ipAddress],
        ["Identity ID", detail.identityId],
        ["Session ID", detail.sessionId],
        ["Created At", time(detail.createdAt)],
      ]
    : [];

  return (
    <div className="fixed inset-0 z-[110] grid place-items-center bg-secondary/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-detail-title"
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck size={20} />
            </span>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary">
                Audit record
              </p>
              <h2 id="audit-detail-title" className="mt-1 text-xl font-black text-secondary">
                {detail?.action ? label(detail.action) : "Activity details"}
              </h2>
              <p className="mt-1 break-all text-xs text-muted-foreground">{auditId}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close audit detail"
            className="rounded-lg border border-border p-2 text-muted-foreground hover:text-secondary"
          >
            <X size={18} />
          </button>
        </div>

        {loading && (
          <div className="grid min-h-52 place-items-center">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Loader2 size={18} className="animate-spin text-primary" />
              Loading audit details…
            </div>
          </div>
        )}

        {!loading && error && (
          <div role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {!loading && detail && (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {fields.map(([key, value]) => (
                <div key={key} className="rounded-xl border border-border bg-muted/30 p-3">
                  <p className="text-[9px] font-extrabold uppercase tracking-wide text-muted-foreground">
                    {key}
                  </p>
                  <p className="mt-1 break-all text-xs font-bold text-secondary">
                    {value === null || value === undefined || value === "" ? "—" : String(value)}
                  </p>
                </div>
              ))}
            </div>

            {detail.metadata && Object.keys(detail.metadata).length > 0 && (
              <div className="mt-5 rounded-xl border border-border">
                <div className="border-b border-border px-4 py-3">
                  <h3 className="text-sm font-black text-secondary">Event metadata</h3>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Extra context stored by the audit service for this event.
                  </p>
                </div>
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words p-4 text-[11px] leading-5 text-secondary">
                  {JSON.stringify(detail.metadata, null, 2)}
                </pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
