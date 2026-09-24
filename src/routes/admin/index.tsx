import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowUpRight,
  Banknote,
  Building2,
  CheckCircle2,
  Clock3,
  IndianRupee,
  Landmark,
  RefreshCw,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { AdminLayout, AdminPanel } from "@/components/admin/admin-layout";
import { DashboardFeature } from "@/components/permission-dashboard";
import { usePermissionDashboard, type DashboardFeatureKey } from "@/lib/permission-dashboard";
import {
  adminApi,
  getAdminActor,
  type AdminDashboardSummary,
  type AepsOverviewMetrics,
} from "@/lib/admin-api";
import { managementBasePath } from "@/lib/role-hierarchy";
import { UI_PERMISSION } from "@/lib/ui-permissions";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin Dashboard — UMOBIPAY" }] }),
  component: AdminDashboard,
});

const metrics: Array<{
  key: "members" | "kyc" | "aeps" | "banks";
  label: string;
  detail: string;
  icon: LucideIcon;
  tone: string;
  feature: DashboardFeatureKey;
}> = [
  {
    key: "members",
    label: "Total merchants",
    detail: "Network-wide accounts",
    icon: Users,
    tone: "bg-blue-50 text-blue-700",
    feature: "network",
  },
  {
    key: "kyc",
    label: "Pending KYC",
    detail: "Pending or under review",
    icon: Activity,
    tone: "bg-emerald-50 text-emerald-700",
    feature: "kycReview",
  },
  {
    key: "aeps",
    label: "Active AEPS",
    detail: "Activated merchants",
    icon: IndianRupee,
    tone: "bg-orange-50 text-orange-700",
    feature: "aeps",
  },
  {
    key: "banks",
    label: "Pending bank accounts",
    detail: "Bank operations queue",
    icon: Clock3,
    tone: "bg-amber-50 text-amber-700",
    feature: "bankOperations",
  },
];

const modules: Array<{
  to: string;
  title: string;
  text: string;
  icon: LucideIcon;
  status: string;
  feature: DashboardFeatureKey;
}> = [
  {
    to: "/admin/merchants",
    title: "Merchant network",
    text: "Retailers, distributors and account lifecycle.",
    icon: Building2,
    status: "Manage",
    feature: "network",
  },
  {
    to: "/admin/transactions",
    title: "Transactions",
    text: "Reconciliation, transaction health and reversals.",
    icon: Banknote,
    status: "Live API",
    feature: "transactions",
  },
  {
    to: "/admin/banking",
    title: "Bank operations",
    text: "Bank accounts and verification operations.",
    icon: Landmark,
    status: "Review",
    feature: "bankOperations",
  },
  {
    to: "/admin/kyc",
    title: "KYC approvals",
    text: "Compliance applications and verification status.",
    icon: ShieldCheck,
    status: "Review",
    feature: "kycReview",
  },
  {
    to: "/admin/settlements",
    title: "Settlements",
    text: "Settlement batches and wallet movement.",
    icon: Wallet,
    status: "Monitor",
    feature: "settlements",
  },
];

export function AdminDashboard() {
  const base = managementBasePath(getAdminActor()?.role);
  const { canShow, canPermission } = usePermissionDashboard();
  const canLoadSummary = canPermission(UI_PERMISSION.ADMIN_DASHBOARD_VIEW, ["ADMIN"]);
  const canLoadAepsVolume = canPermission(UI_PERMISSION.TRANSACTION_AEPS_OVERVIEW_VIEW, ["ADMIN"]);
  const canShowTransactions = canShow("transactions");
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [aepsVolume, setAepsVolume] = useState<AepsOverviewMetrics | null>(null);
  const [loadingAepsVolume, setLoadingAepsVolume] = useState(false);
  const [aepsVolumeError, setAepsVolumeError] = useState("");
  const loadSummary = useCallback(async () => {
    if (!canLoadSummary) return;
    setLoadingSummary(true);
    setSummaryError("");
    try {
      setSummary(await adminApi.operations.dashboardSummary());
    } catch (value) {
      setSummaryError(value instanceof Error ? value.message : "Dashboard summary could not load.");
    } finally {
      setLoadingSummary(false);
    }
  }, [canLoadSummary]);
  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);
  const loadAepsVolume = useCallback(async () => {
    if (!canLoadAepsVolume) return;
    setLoadingAepsVolume(true);
    setAepsVolumeError("");
    try {
      setAepsVolume(await adminApi.aepsOverview());
    } catch (value) {
      setAepsVolumeError(
        value instanceof Error ? value.message : "Transaction volume could not load.",
      );
    } finally {
      setLoadingAepsVolume(false);
    }
  }, [canLoadAepsVolume]);
  useEffect(() => {
    void loadAepsVolume();
  }, [loadAepsVolume]);
  const degradedServices = summary?.degradedServices ?? [];
  const metricUnavailable = (key: (typeof metrics)[number]["key"]) =>
    degradedServices.includes(key === "members" ? "auth" : key === "banks" ? "bank" : key);
  const metricValue = (key: (typeof metrics)[number]["key"]) => {
    if (!summary || metricUnavailable(key)) return "—";
    if (key === "members") return String(summary.members.total);
    if (key === "kyc") return String(summary.kyc.pendingOrInProgress);
    if (key === "aeps") return String(summary.aeps.active);
    return String(summary.bankAccounts.pending);
  };
  return (
    <AdminLayout
      active="dashboard"
      eyebrow="Operations overview"
      title="Admin dashboard"
      description="Monitor the platform, review operational queues and open every administration service from one command center."
    >
      <section className="relative overflow-hidden rounded-[28px] bg-[#00645c] p-7 text-white shadow-xl shadow-secondary/10 sm:p-9">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-7 xl:flex-row xl:items-end">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-emerald-200">
              <CheckCircle2 size={15} /> Secure admin session active
            </span>
            <h2 className="mt-5 text-2xl font-black sm:text-3xl">
              UMOBIPAY operations at a glance
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/65">
              Live member, KYC, AEPS and bank-account totals from the admin summary service.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex">
            <DashboardFeature allowed={canShow("network")}>
              <HeroStat
                label="Active members"
                value={
                  summary && !degradedServices.includes("auth")
                    ? String(summary.members.active)
                    : "—"
                }
              />
            </DashboardFeature>
            <DashboardFeature allowed={canShow("kycReview")}>
              <HeroStat
                label="KYC approved"
                value={
                  summary && !degradedServices.includes("kyc") ? String(summary.kyc.approved) : "—"
                }
              />
            </DashboardFeature>
            <HeroStat
              label="Platform status"
              value={degradedServices.length ? "Degraded" : "Online"}
            />
          </div>
        </div>
      </section>

      {summaryError && (
        <div className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
          <span>{summaryError}</span>
          <button
            type="button"
            onClick={() => void loadSummary()}
            className="rounded-lg border border-red-200 px-3 py-2"
          >
            Retry
          </button>
        </div>
      )}
      {!summaryError && degradedServices.length > 0 && (
        <div className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">
          <span>
            Live counters are temporarily unavailable for: {degradedServices.join(", ")}. Available
            services are still shown.
          </span>
          <button
            type="button"
            onClick={() => void loadSummary()}
            className="rounded-lg border border-amber-200 px-3 py-2"
          >
            Retry
          </button>
        </div>
      )}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics
          .filter(({ feature }) => canShow(feature))
          .map(({ key, label, detail, icon: Icon, tone }) => (
            <AdminPanel key={label} className="min-h-44">
              <div className="flex items-start justify-between">
                <span className={`grid h-11 w-11 place-items-center rounded-xl ${tone}`}>
                  <Icon size={21} />
                </span>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${
                    metricUnavailable(key)
                      ? "bg-amber-50 text-amber-700"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {metricUnavailable(key) ? "TEMPORARILY UNAVAILABLE" : "LIVE READY"}
                </span>
              </div>
              <p className="mt-5 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <p className="mt-1 text-2xl font-black">{loadingSummary ? "…" : metricValue(key)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
            </AdminPanel>
          ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_.75fr]">
        <DashboardFeature allowed={canLoadAepsVolume}>
          <AdminPanel>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-primary">
                  Transaction volume
                </p>
                <h2 className="mt-1 text-xl font-black">AEPS volume · last 24 hours</h2>
              </div>
              {canShowTransactions ? (
                <Link
                  to={`${base}/transactions` as never}
                  className="flex items-center gap-1 text-xs font-extrabold text-primary"
                >
                  View transactions <ArrowUpRight size={15} />
                </Link>
              ) : null}
            </div>

            {aepsVolumeError ? (
              <div className="mt-6 flex min-h-52 items-center justify-center rounded-2xl bg-red-50 p-5 text-center">
                <div>
                  <p className="text-sm font-bold text-red-700">{aepsVolumeError}</p>
                  <button
                    type="button"
                    onClick={() => void loadAepsVolume()}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-extrabold text-red-700"
                  >
                    <RefreshCw size={14} /> Retry
                  </button>
                </div>
              </div>
            ) : loadingAepsVolume && !aepsVolume ? (
              <div className="mt-6 grid min-h-52 place-items-center rounded-2xl bg-secondary/[.03]">
                <RefreshCw size={22} className="animate-spin text-primary" />
              </div>
            ) : aepsVolume ? (
              <div className="mt-6">
                <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                  <div className="rounded-2xl bg-secondary p-6 text-white">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-white/60">
                      Total financial volume
                    </p>
                    <p className="mt-2 text-3xl font-black sm:text-4xl">
                      {formatMoney(aepsVolume.totals.financialVolume)}
                    </p>
                    <div className="mt-6 border-t border-white/15 pt-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                        Successful financial volume
                      </p>
                      <p className="mt-1 text-lg font-black text-emerald-200">
                        {formatMoney(aepsVolume.totals.successfulFinancialVolume)}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <VolumeMetric
                      label="Transactions"
                      value={aepsVolume.totals.transactions.toLocaleString("en-IN")}
                    />
                    <VolumeMetric
                      label="Financial"
                      value={aepsVolume.totals.financialTransactions.toLocaleString("en-IN")}
                    />
                    <VolumeMetric
                      label="Average ticket"
                      value={formatMoney(aepsVolume.totals.averageFinancialTicket)}
                    />
                    <VolumeMetric
                      label="Success rate"
                      value={`${aepsVolume.totals.successRate.toFixed(1)}%`}
                    />
                  </div>
                </div>

                {aepsVolume.operations.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2" aria-label="Volume by AEPS operation">
                    {aepsVolume.operations.map((operation) => (
                      <span
                        key={operation.operation}
                        className="rounded-full border border-border bg-secondary/[.03] px-3 py-1.5 text-[11px] font-bold"
                      >
                        {operation.operation}: {formatMoney(operation.volume)}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="mt-4 flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  <span>
                    {aepsVolume.totals.reconciliationRequired.toLocaleString("en-IN")} requiring
                    reconciliation
                  </span>
                  <span>Updated {formatDashboardTime(aepsVolume.generatedAt)}</span>
                </div>
              </div>
            ) : null}
          </AdminPanel>
        </DashboardFeature>
        <AdminPanel>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-primary">
                Action center
              </p>
              <h2 className="mt-1 text-xl font-black">Review queues</h2>
            </div>
            <RefreshCw size={18} className="text-muted-foreground" />
          </div>
          <div className="mt-5 space-y-3">
            <DashboardFeature allowed={canShow("kycReview")}>
              <QueueRow
                to={`${base}/kyc`}
                icon={ShieldCheck}
                label="KYC applications"
                value="Open queue"
              />
            </DashboardFeature>
            <DashboardFeature allowed={canShow("bankOperations")}>
              <QueueRow
                to={`${base}/banking`}
                icon={Landmark}
                label="Bank verification"
                value="Open queue"
              />
            </DashboardFeature>
            <DashboardFeature allowed={canShow("transactions")}>
              <QueueRow
                to={`${base}/transactions`}
                icon={Banknote}
                label="Reconciliation"
                value="Live API"
              />
            </DashboardFeature>
            <DashboardFeature allowed={canShow("access")}>
              <QueueRow
                to={`${base}/access`}
                icon={Users}
                label="Roles & permissions"
                value="Live API"
              />
            </DashboardFeature>
          </div>
        </AdminPanel>
      </div>

      <div className="mt-6">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-primary">
              Administration modules
            </p>
            <h2 className="mt-1 text-2xl font-black">Manage platform services</h2>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {modules
            .filter(({ feature }) => canShow(feature))
            .map(({ to, title, text, icon: Icon, status }) => (
              <Link
                key={to}
                to={`${base}${to.slice("/admin".length)}` as never}
                className="group rounded-2xl border border-border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon size={21} />
                  </span>
                  <ArrowUpRight
                    size={17}
                    className="text-muted-foreground transition group-hover:text-primary"
                  />
                </div>
                <h3 className="mt-5 font-black group-hover:text-primary">{title}</h3>
                <p className="mt-2 min-h-10 text-xs leading-5 text-muted-foreground">{text}</p>
                <p className="mt-4 text-[10px] font-extrabold uppercase tracking-wider text-primary">
                  {status}
                </p>
              </Link>
            ))}
        </div>
      </div>
    </AdminLayout>
  );
}

function formatMoney(value: string | number) {
  const amount = Number(value);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDashboardTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "just now"
    : date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function VolumeMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-secondary/[.03] p-4">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-lg font-black text-secondary">{value}</p>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-32 rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-white/55">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  );
}

function QueueRow({
  to,
  icon: Icon,
  label,
  value,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-xl border border-border p-3 transition hover:border-primary/40 hover:bg-primary/[.03]"
    >
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-secondary/5 text-secondary">
        <Icon size={17} />
      </span>
      <span className="min-w-0 flex-1 text-sm font-bold">{label}</span>
      <span className="text-[10px] font-extrabold uppercase text-primary">{value}</span>
    </Link>
  );
}
