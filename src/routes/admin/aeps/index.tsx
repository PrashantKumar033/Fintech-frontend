import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Fingerprint, Loader2, RefreshCw, Settings2, Users } from "lucide-react";
import { AdminLayout, AdminPanel } from "@/components/admin/admin-layout";
import { AepsWorkspace } from "@/components/aeps-workspace";
import { adminApi, getAdminActor, type AepsOverviewMetrics } from "@/lib/admin-api";

export const Route = createFileRoute("/admin/aeps/")({ component: AdminAepsPage });

function AdminAepsPage() {
  if (getAdminActor()?.kind === "IDENTITY_ADMIN") return <AepsWorkspace />;
  return <SuperAdminAepsPage />;
}

function SuperAdminAepsPage() {
  const [tab, setTab] = useState<"overview" | "manage">("overview");

  return (
    <AdminLayout
      active="aeps"
      eyebrow="Assisted banking"
      title="AEPS management"
      description="Monitor merchants and transactions, reconcile provider activity and manage VimoPay service availability."
    >
      <div className="mb-5 flex w-fit gap-1 rounded-2xl border border-border bg-white p-1">
        <button
          type="button"
          onClick={() => setTab("overview")}
          className={`cursor-pointer whitespace-nowrap rounded-xl px-5 py-3 text-sm font-black ${tab === "overview" ? "bg-secondary text-white" : "text-secondary"}`}
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => setTab("manage")}
          className={`cursor-pointer whitespace-nowrap rounded-xl px-5 py-3 text-sm font-black ${tab === "manage" ? "bg-secondary text-white" : "text-secondary"}`}
        >
          Manage
        </button>
      </div>

      {tab === "overview" ? <AepsOverviewPanel /> : <AepsManagePanel />}
    </AdminLayout>
  );
}

// ── Overview Panel ────────────────────────────────────────────────────────────

const OPERATIONS = ["BE", "MS", "CW", "AP", "CD"] as const;
type Operation = (typeof OPERATIONS)[number];
const OP_LABELS: Record<Operation, string> = {
  BE: "Balance Enquiry",
  MS: "Mini Statement",
  CW: "Cash Withdrawal",
  AP: "Aadhaar Pay",
  CD: "Cash Deposit",
};

function AepsOverviewPanel() {
  const [data, setData] = useState<AepsOverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [provider, setProvider] = useState("");
  const [operation, setOperation] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (provider) params.set("provider", provider);
      if (operation) params.set("operation", operation);
      if (fromDate) params.set("fromDate", fromDate);
      if (toDate) params.set("toDate", toDate);
      setData(await adminApi.aepsOverview(params.toString()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load AEPS overview.");
    } finally {
      setLoading(false);
    }
  }, [provider, operation, fromDate, toDate]);

  useEffect(() => void load(), [load]);

  const money = (v?: string | number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(v ?? 0));

  const pendingCount = data
    ? ["INITIATED", "PROCESSING", "PENDING", "UNKNOWN"].reduce(
        (total, status) => total + Number(data.statuses[status] ?? 0),
        0,
      )
    : 0;

  return (
    <>
      {/* Filters */}
      <AdminPanel className="mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-black uppercase">
            Provider
            <input
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder="e.g. VIMOPAY"
              className="mt-1 block w-40 rounded-xl border border-border px-3 py-2 text-sm font-normal normal-case outline-none focus:border-primary"
            />
          </label>
          <label className="text-xs font-black uppercase">
            Operation
            <select
              value={operation}
              onChange={(e) => setOperation(e.target.value)}
              className="mt-1 block w-40 rounded-xl border border-border px-3 py-2 text-sm font-normal normal-case outline-none focus:border-primary"
            >
              <option value="">All</option>
              {OPERATIONS.map((op) => (
                <option key={op} value={op}>
                  {op} — {OP_LABELS[op]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-black uppercase">
            From date
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="mt-1 block rounded-xl border border-border px-3 py-2 text-sm font-normal normal-case outline-none focus:border-primary"
            />
          </label>
          <label className="text-xs font-black uppercase">
            To date
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="mt-1 block rounded-xl border border-border px-3 py-2 text-sm font-normal normal-case outline-none focus:border-primary"
            />
          </label>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Apply
          </button>
        </div>
      </AdminPanel>

      {error ? (
        <p className="mb-5 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>
      ) : null}

      {loading && !data ? (
        <AdminPanel className="grid min-h-64 place-items-center">
          <Loader2 className="animate-spin text-primary" />
        </AdminPanel>
      ) : data ? (
        <>
          {/* Summary cards */}
          <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Total transactions" value={String(data.totals.transactions)} />
            <MetricCard
              label="Successful"
              value={String(data.statuses.SUCCESS ?? 0)}
              sub={`${data.totals.successRate.toFixed(1)}% success rate`}
              tone="good"
            />
            <MetricCard label="Failed" value={String(data.statuses.FAILED ?? 0)} tone="bad" />
            <MetricCard label="Pending" value={String(pendingCount)} tone="warn" />
          </div>
          <div className="mb-5 grid gap-4 sm:grid-cols-3">
            <MetricCard label="Total volume" value={money(data.totals.financialVolume)} />
            <MetricCard
              label="Success volume"
              value={money(data.totals.successfulFinancialVolume)}
              tone="good"
            />
            <MetricCard label="Settled commission" value={money(data.commission.settledAmount)} />
          </div>

          {/* By operation */}
          {data.operations.length > 0 ? (
            <AdminPanel className="mb-5">
              <h2 className="mb-4 text-lg font-black">By operation</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="pb-3 pr-6">Operation</th>
                      <th className="pb-3 pr-6">Count</th>
                      <th className="pb-3">Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.operations.map((stats) => (
                      <tr key={stats.operation} className="border-t border-border/60">
                        <td className="py-3 pr-6 font-black">
                          {stats.operation}
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            {OP_LABELS[stats.operation as Operation] ?? ""}
                          </span>
                        </td>
                        <td className="py-3 pr-6">{stats.total}</td>
                        <td className="py-3">{money(stats.volume)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AdminPanel>
          ) : null}

          {/* By provider */}
          {data.providers.length > 0 ? (
            <AdminPanel className="mb-5">
              <h2 className="mb-4 text-lg font-black">By provider</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="pb-3 pr-6">Provider</th>
                      <th className="pb-3 pr-6">Count</th>
                      <th className="pb-3">Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.providers.map((stats) => (
                      <tr key={stats.provider} className="border-t border-border/60">
                        <td className="py-3 pr-6 font-black">{stats.provider}</td>
                        <td className="py-3 pr-6">{stats.total}</td>
                        <td className="py-3">{money(stats.volume)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AdminPanel>
          ) : null}

          {data.generatedAt ? (
            <p className="text-right text-xs text-muted-foreground">
              Generated at {new Date(data.generatedAt).toLocaleString("en-IN")}
            </p>
          ) : null}
        </>
      ) : null}
    </>
  );
}

// ── Manage Panel (existing quick-links) ──────────────────────────────────────

function AepsManagePanel() {
  const actions = [
    {
      title: "AEPS merchants",
      description: "Review merchant onboarding and update or synchronize merchant status.",
      to: "/admin/merchants/list",
      icon: Users,
    },
    {
      title: "AEPS transactions",
      description: "Monitor provider transactions, reconciliation and reversals.",
      to: "/admin/transactions",
      icon: Fingerprint,
    },
    {
      title: "Provider controls",
      description: "Check VimoPay availability and control individual AEPS operations.",
      to: "/admin/api-settings",
      icon: Settings2,
    },
  ] as const;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {actions.map(({ title, description, to, icon: Icon }) => (
        <Link key={title} to={to} className="block cursor-pointer">
          <AdminPanel className="h-full transition hover:border-primary hover:shadow-md">
            <Icon className="text-primary" />
            <h2 className="mt-4 text-lg font-black">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
          </AdminPanel>
        </Link>
      ))}
    </div>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "good" | "bad" | "warn";
}) {
  return (
    <AdminPanel>
      <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-2 text-2xl font-black ${tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-red-600" : tone === "warn" ? "text-amber-600" : "text-secondary"}`}
      >
        {value}
      </p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </AdminPanel>
  );
}
