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
import { adminApi, getAdminActor, type AdminDashboardSummary } from "@/lib/admin-api";
import { managementBasePath } from "@/lib/role-hierarchy";

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
}> = [
  {
    key: "members",
    label: "Total merchants",
    detail: "Network-wide accounts",
    icon: Users,
    tone: "bg-blue-50 text-blue-700",
  },
  {
    key: "kyc",
    label: "Pending KYC",
    detail: "Pending or under review",
    icon: Activity,
    tone: "bg-emerald-50 text-emerald-700",
  },
  {
    key: "aeps",
    label: "Active AEPS",
    detail: "Activated merchants",
    icon: IndianRupee,
    tone: "bg-orange-50 text-orange-700",
  },
  {
    key: "banks",
    label: "Pending bank accounts",
    detail: "Bank operations queue",
    icon: Clock3,
    tone: "bg-amber-50 text-amber-700",
  },
];

const modules: Array<{
  to: string;
  title: string;
  text: string;
  icon: LucideIcon;
  status: string;
}> = [
  {
    to: "/admin/merchants",
    title: "Merchant network",
    text: "Retailers, distributors and account lifecycle.",
    icon: Building2,
    status: "Manage",
  },
  {
    to: "/admin/transactions",
    title: "Transactions",
    text: "Reconciliation, transaction health and reversals.",
    icon: Banknote,
    status: "Live API",
  },
  {
    to: "/admin/banking",
    title: "Bank operations",
    text: "Bank accounts and verification operations.",
    icon: Landmark,
    status: "Review",
  },
  {
    to: "/admin/kyc",
    title: "KYC approvals",
    text: "Compliance applications and verification status.",
    icon: ShieldCheck,
    status: "Review",
  },
  {
    to: "/admin/settlements",
    title: "Settlements",
    text: "Settlement batches and wallet movement.",
    icon: Wallet,
    status: "Monitor",
  },
];

const bars = [38, 54, 46, 68, 59, 77, 65, 88, 73, 92, 81, 96];

export function AdminDashboard() {
  const base = managementBasePath(getAdminActor()?.role);
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const loadSummary = useCallback(async () => {
    setLoadingSummary(true);
    setSummaryError("");
    try {
      setSummary(await adminApi.operations.dashboardSummary());
    } catch (value) {
      setSummaryError(value instanceof Error ? value.message : "Dashboard summary could not load.");
    } finally {
      setLoadingSummary(false);
    }
  }, []);
  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);
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
            <HeroStat
              label="Active members"
              value={
                summary && !degradedServices.includes("auth") ? String(summary.members.active) : "—"
              }
            />
            <HeroStat
              label="KYC approved"
              value={
                summary && !degradedServices.includes("kyc") ? String(summary.kyc.approved) : "—"
              }
            />
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
        {metrics.map(({ key, label, detail, icon: Icon, tone }) => (
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
        <AdminPanel>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-primary">
                Transaction monitoring
              </p>
              <h2 className="mt-1 text-xl font-black">Processing activity</h2>
            </div>
            <Link
              to={`${base}/transactions` as never}
              className="flex items-center gap-1 text-xs font-extrabold text-primary"
            >
              View transactions <ArrowUpRight size={15} />
            </Link>
          </div>
          <div
            className="mt-8 flex h-52 items-end gap-2 sm:gap-3"
            aria-label="Transaction activity chart"
          >
            {bars.map((height, index) => (
              <div key={index} className="group flex h-full flex-1 items-end">
                <div
                  className="w-full rounded-t-md bg-secondary/15 transition group-hover:bg-primary"
                  style={{ height: `${height}%` }}
                />
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between text-[10px] font-bold uppercase text-muted-foreground">
            <span>12 AM</span>
            <span>6 AM</span>
            <span>12 PM</span>
            <span>Now</span>
          </div>
        </AdminPanel>
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
            <QueueRow
              to={`${base}/kyc`}
              icon={ShieldCheck}
              label="KYC applications"
              value="Open queue"
            />
            <QueueRow
              to={`${base}/banking`}
              icon={Landmark}
              label="Bank verification"
              value="Open queue"
            />
            <QueueRow
              to={`${base}/transactions`}
              icon={Banknote}
              label="Reconciliation"
              value="Live API"
            />
            <QueueRow
              to={`${base}/access`}
              icon={Users}
              label="Roles & permissions"
              value="Live API"
            />
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
          {modules.map(({ to, title, text, icon: Icon, status }) => (
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
