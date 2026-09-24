import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  Loader2,
  Power,
  RefreshCw,
  ShieldCheck,
  ToggleLeft,
  X,
  Zap,
} from "lucide-react";
import { AdminLayout, AdminPanel } from "@/components/admin/admin-layout";
import { SuperAdminAepsTwoFactor } from "@/components/admin/super-admin-aeps-two-factor";
import { useEffectiveAccess } from "@/hooks/use-effective-access";
import {
  adminApi,
  getAdminActor,
  type AdminAepsProviderService,
  type AdminAepsProviderStatus,
  type ProviderRegistryEntry,
  type ServiceControlStatus,
} from "@/lib/admin-api";
import { UI_PERMISSION } from "@/lib/ui-permissions";

export const Route = createFileRoute("/admin/api-settings/")({ component: ApiSettings });

type Workspace = "providerServices" | "providers" | "serviceControl" | "twoFactor";
type ToggleTarget = { provider: string; service: AdminAepsProviderService };

function ApiSettings() {
  const { can } = useEffectiveAccess();
  const privileged = getAdminActor()?.kind === "SUPER_ADMIN";
  const canView =
    privileged || can(UI_PERMISSION.AEPS_PROVIDER_STATUS_VIEW, ["SUPER_ADMIN", "ADMIN"]);
  const canUpdate =
    privileged || can(UI_PERMISSION.AEPS_PROVIDER_SERVICE_STATUS_UPDATE, ["SUPER_ADMIN", "ADMIN"]);

  const [workspace, setWorkspace] = useState<Workspace>("providerServices");

  // ── Provider Services (existing) ──────────────────────────────────────────
  const [data, setData] = useState<AdminAepsProviderStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [target, setTarget] = useState<ToggleTarget | null>(null);
  const [reason, setReason] = useState("");

  const loadProviderServices = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setError("");
    try {
      setData(await adminApi.operations.aepsProviderStatus());
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    if (workspace === "providerServices") void loadProviderServices();
  }, [workspace, loadProviderServices]);

  async function confirmToggle() {
    if (!target || !canUpdate) return;
    const nextEnabled = !target.service.isEnabled;
    if (!nextEnabled && !reason.trim()) {
      setError("Enter a reason before disabling an AEPS operation.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await adminApi.operations.updateAepsProviderServiceStatus(
        target.provider,
        target.service.operation,
        nextEnabled,
        reason,
      );
      setNotice(`${target.service.name} ${nextEnabled ? "enabled" : "disabled"}.`);
      setTarget(null);
      setReason("");
      await loadProviderServices();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }

  const tabs: Array<{ key: Workspace; label: string; superAdminOnly?: boolean }> = [
    { key: "providerServices", label: "Provider services" },
    { key: "providers", label: "Provider master switch", superAdminOnly: true },
    { key: "serviceControl", label: "Service control", superAdminOnly: true },
    { key: "twoFactor", label: "2FA fees & reconciliation", superAdminOnly: true },
  ];

  return (
    <AdminLayout
      active="api"
      eyebrow="Integrations"
      title="AEPS platform controls"
      description="Manage provider availability, service switches, daily 2FA fees and financial reconciliation from live backend contracts."
    >
      <div className="mb-5 flex w-fit max-w-full gap-1 overflow-x-auto rounded-2xl border border-border bg-white p-1">
        {tabs.map(({ key, label, superAdminOnly }) => {
          if (superAdminOnly && !privileged) return null;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setError("");
                setNotice("");
                setWorkspace(key);
              }}
              className={`cursor-pointer whitespace-nowrap rounded-xl px-5 py-3 text-sm font-black ${workspace === key ? "bg-secondary text-white" : "text-secondary"}`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {workspace === "twoFactor" && privileged ? (
        <SuperAdminAepsTwoFactor />
      ) : workspace === "providers" && privileged ? (
        <ProvidersPanel />
      ) : workspace === "serviceControl" && privileged ? (
        <ServiceControlPanel />
      ) : (
        <>
          {error ? <Banner tone="error">{error}</Banner> : null}
          {notice ? <Banner tone="success">{notice}</Banner> : null}
          {!canView ? (
            <AdminPanel>
              <p className="py-10 text-center text-sm text-muted-foreground">
                Permission {UI_PERMISSION.AEPS_PROVIDER_STATUS_VIEW} is required.
              </p>
            </AdminPanel>
          ) : (
            <>
              <div className="mb-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => void loadProviderServices()}
                  disabled={loading}
                  className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-bold disabled:cursor-not-allowed"
                >
                  <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
                </button>
              </div>
              {loading && !data ? (
                <AdminPanel className="grid min-h-64 place-items-center">
                  <Loader2 className="animate-spin text-primary" />
                </AdminPanel>
              ) : data?.providers.length ? (
                <div className="space-y-5">
                  {data.providers.map((provider) => (
                    <AdminPanel key={provider.provider}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                            <Activity size={20} />
                          </span>
                          <div>
                            <h2 className="text-xl font-black">{provider.provider}</h2>
                            <p className="text-xs text-muted-foreground">
                              {provider.enabledServices} of {provider.totalServices} operations
                              enabled
                            </p>
                          </div>
                        </div>
                        <StatusBadge value={provider.status} />
                      </div>
                      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {provider.services.map((service) => (
                          <article
                            key={service.operation}
                            className="rounded-xl border border-border p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xs font-black text-primary">
                                  {service.operation}
                                </p>
                                <h3 className="font-black">{service.name}</h3>
                              </div>
                              <span
                                className={`rounded-full px-2 py-1 text-[10px] font-black ${service.isEnabled ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
                              >
                                {service.isEnabled ? "ENABLED" : "DISABLED"}
                              </span>
                            </div>
                            {service.reason ? (
                              <p className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-700">
                                {service.reason}
                              </p>
                            ) : null}
                            <p className="mt-3 text-[11px] text-muted-foreground">
                              {service.updatedAt
                                ? `Last updated ${new Date(service.updatedAt).toLocaleString("en-IN")}`
                                : "Using default enabled configuration"}
                            </p>
                            <button
                              type="button"
                              disabled={!canUpdate}
                              onClick={() => {
                                setTarget({ provider: provider.provider, service });
                                setReason("");
                                setError("");
                              }}
                              className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-border py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <ToggleLeft size={17} /> {service.isEnabled ? "Disable" : "Enable"}
                            </button>
                          </article>
                        ))}
                      </div>
                    </AdminPanel>
                  ))}
                </div>
              ) : (
                <AdminPanel>
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    No AEPS provider configuration was returned.
                  </p>
                </AdminPanel>
              )}
            </>
          )}

          {target ? (
            <div className="fixed inset-0 z-[110] grid place-items-center bg-secondary/60 p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase text-primary">Provider control</p>
                    <h2 className="text-xl font-black">
                      {target.service.isEnabled ? "Disable" : "Enable"} {target.service.name}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTarget(null)}
                    className="cursor-pointer rounded-xl border border-border p-2"
                  >
                    <X />
                  </button>
                </div>
                {!target.service.isEnabled ? (
                  <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
                    This operation will become available immediately.
                  </p>
                ) : (
                  <label className="mt-4 block text-xs font-black uppercase">
                    Disable reason
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={4}
                      placeholder="Explain why this operation is being disabled"
                      className="mt-2 w-full rounded-xl border border-border p-3 text-sm font-normal normal-case outline-none focus:border-primary"
                    />
                  </label>
                )}
                <button
                  type="button"
                  onClick={() => void confirmToggle()}
                  disabled={busy}
                  className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
                  Confirm change
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </AdminLayout>
  );
}

// ── Provider Master Switch Panel ─────────────────────────────────────────────

function ProvidersPanel() {
  const [providers, setProviders] = useState<ProviderRegistryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirm, setConfirm] = useState<ProviderRegistryEntry | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await adminApi.superAdminAeps.providers.list();
      setProviders(Array.isArray(result) ? result : []);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => void load(), [load]);

  async function toggle(provider: ProviderRegistryEntry) {
    setBusy(provider.publicCode);
    setError("");
    setNotice("");
    try {
      await adminApi.superAdminAeps.providers.updateStatus(
        provider.publicCode,
        !provider.isActive,
      );
      setNotice(
        `${provider.publicName} ${!provider.isActive ? "enabled" : "disabled"} successfully.`,
      );
      setConfirm(null);
      await load();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {error ? <Banner tone="error">{error}</Banner> : null}
      {notice ? <Banner tone="success">{notice}</Banner> : null}
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-bold disabled:cursor-not-allowed"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>
      {loading ? (
        <AdminPanel className="grid min-h-64 place-items-center">
          <Loader2 className="animate-spin text-primary" />
        </AdminPanel>
      ) : providers.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {providers.map((p) => (
            <AdminPanel key={p.publicCode}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Power size={20} />
                  </span>
                  <div>
                    <h2 className="font-black">{p.publicName}</h2>
                    <p className="text-xs text-muted-foreground">{p.publicCode}</p>
                    <p className="text-xs text-muted-foreground">{p.serviceType}</p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-black ${p.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
                >
                  {p.isActive ? "ACTIVE" : "INACTIVE"}
                </span>
              </div>
              {p.updatedAt ? (
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Last updated {new Date(p.updatedAt).toLocaleString("en-IN")}
                </p>
              ) : null}
              <button
                type="button"
                disabled={busy === p.publicCode}
                onClick={() => setConfirm(p)}
                className={`mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50 ${p.isActive ? "border border-red-200 text-red-600 hover:bg-red-50" : "border border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}
              >
                {busy === p.publicCode ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Power size={15} />
                )}
                {p.isActive ? "Disable provider" : "Enable provider"}
              </button>
            </AdminPanel>
          ))}
        </div>
      ) : (
        <AdminPanel>
          <p className="py-10 text-center text-sm text-muted-foreground">
            No providers found.
          </p>
        </AdminPanel>
      )}

      {confirm ? (
        <div className="fixed inset-0 z-[110] grid place-items-center bg-secondary/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-primary">Provider master switch</p>
                <h2 className="text-xl font-black">
                  {confirm.isActive ? "Disable" : "Enable"} {confirm.publicName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setConfirm(null)}
                className="cursor-pointer rounded-xl border border-border p-2"
              >
                <X />
              </button>
            </div>
            <p
              className={`mt-4 rounded-xl p-3 text-sm ${confirm.isActive ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
            >
              {confirm.isActive
                ? `Disabling ${confirm.publicName} will make all its AEPS operations unavailable platform-wide immediately.`
                : `Enabling ${confirm.publicName} will restore all its AEPS operations immediately.`}
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                className="flex-1 rounded-xl border border-border py-3 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy === confirm.publicCode}
                onClick={() => void toggle(confirm)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50 ${confirm.isActive ? "bg-red-600" : "bg-emerald-600"}`}
              >
                {busy === confirm.publicCode ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ShieldCheck size={16} />
                )}
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

// ── Service Control Panel ─────────────────────────────────────────────────────

const SERVICE_TYPES = ["AEPS", "DMT", "BBPS", "RECHARGE"] as const;

function ServiceControlPanel() {
  const [statuses, setStatuses] = useState<Record<string, ServiceControlStatus>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirm, setConfirm] = useState<{ serviceType: string; nextEnabled: boolean } | null>(
    null,
  );
  const [disableReason, setDisableReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const results = await Promise.allSettled(
        SERVICE_TYPES.map((s) => adminApi.superAdminAeps.serviceControl.get(s)),
      );
      const map: Record<string, ServiceControlStatus> = {};
      results.forEach((r, i) => {
        if (r.status === "fulfilled") map[SERVICE_TYPES[i]] = r.value;
      });
      setStatuses(map);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => void load(), [load]);

  async function applyToggle() {
    if (!confirm) return;
    if (!confirm.nextEnabled && !disableReason.trim()) {
      setError("Enter a reason before disabling a service.");
      return;
    }
    setBusy(confirm.serviceType);
    setError("");
    setNotice("");
    try {
      await adminApi.superAdminAeps.serviceControl.update(
        confirm.serviceType,
        confirm.nextEnabled,
        confirm.nextEnabled ? undefined : disableReason,
      );
      setNotice(
        `${confirm.serviceType} service ${confirm.nextEnabled ? "enabled" : "disabled"} platform-wide.`,
      );
      setConfirm(null);
      setDisableReason("");
      await load();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {error ? <Banner tone="error">{error}</Banner> : null}
      {notice ? <Banner tone="success">{notice}</Banner> : null}
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-bold disabled:cursor-not-allowed"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>
      {loading ? (
        <AdminPanel className="grid min-h-64 place-items-center">
          <Loader2 className="animate-spin text-primary" />
        </AdminPanel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {SERVICE_TYPES.map((serviceType) => {
            const s = statuses[serviceType];
            const enabled = s?.enabled ?? true;
            return (
              <AdminPanel key={serviceType}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Zap size={20} />
                    </span>
                    <div>
                      <h2 className="font-black">{serviceType}</h2>
                      <p className="text-xs text-muted-foreground">Platform service</p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-black ${enabled ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
                  >
                    {enabled ? "ENABLED" : "DISABLED"}
                  </span>
                </div>
                {s?.reason ? (
                  <p className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-700">{s.reason}</p>
                ) : null}
                {s?.updatedAt ? (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Last updated {new Date(s.updatedAt).toLocaleString("en-IN")}
                  </p>
                ) : null}
                <button
                  type="button"
                  disabled={busy === serviceType || !s}
                  onClick={() => {
                    setConfirm({ serviceType, nextEnabled: !enabled });
                    setDisableReason("");
                    setError("");
                  }}
                  className={`mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50 ${enabled ? "border border-red-200 text-red-600 hover:bg-red-50" : "border border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}
                >
                  {busy === serviceType ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Power size={15} />
                  )}
                  {enabled ? "Disable" : "Enable"}
                </button>
              </AdminPanel>
            );
          })}
        </div>
      )}

      {confirm ? (
        <div className="fixed inset-0 z-[110] grid place-items-center bg-secondary/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-primary">Platform service control</p>
                <h2 className="text-xl font-black">
                  {confirm.nextEnabled ? "Enable" : "Disable"} {confirm.serviceType}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setConfirm(null)}
                className="cursor-pointer rounded-xl border border-border p-2"
              >
                <X />
              </button>
            </div>
            {confirm.nextEnabled ? (
              <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
                {confirm.serviceType} will be enabled for all users platform-wide immediately.
              </p>
            ) : (
              <>
                <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                  {confirm.serviceType} will be disabled for all users platform-wide immediately.
                </p>
                <label className="mt-4 block text-xs font-black uppercase">
                  Disable reason
                  <textarea
                    value={disableReason}
                    onChange={(e) => setDisableReason(e.target.value)}
                    rows={3}
                    placeholder="Explain why this service is being disabled"
                    className="mt-2 w-full rounded-xl border border-border p-3 text-sm font-normal normal-case outline-none focus:border-primary"
                  />
                </label>
              </>
            )}
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                className="flex-1 rounded-xl border border-border py-3 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy === confirm.serviceType}
                onClick={() => void applyToggle()}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50 ${confirm.nextEnabled ? "bg-emerald-600" : "bg-red-600"}`}
              >
                {busy === confirm.serviceType ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ShieldCheck size={16} />
                )}
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function StatusBadge({ value }: { value: string }) {
  const good = value === "ENABLED";
  const bad = value === "DISABLED";
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${good ? "bg-emerald-50 text-emerald-700" : bad ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}

function Banner({ tone, children }: { tone: "error" | "success"; children: React.ReactNode }) {
  return (
    <p
      className={`mb-4 rounded-xl p-3 text-sm font-semibold ${tone === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
    >
      {children}
    </p>
  );
}

function messageOf(value: unknown) {
  return value instanceof Error ? value.message : "The request could not be completed.";
}
