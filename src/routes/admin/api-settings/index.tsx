import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, Loader2, RefreshCw, ShieldCheck, ToggleLeft, X } from "lucide-react";
import { AdminLayout, AdminPanel } from "@/components/admin/admin-layout";
import { SuperAdminAepsTwoFactor } from "@/components/admin/super-admin-aeps-two-factor";
import { useEffectiveAccess } from "@/hooks/use-effective-access";
import {
  adminApi,
  getAdminActor,
  type AdminAepsProviderService,
  type AdminAepsProviderStatus,
} from "@/lib/admin-api";
import { UI_PERMISSION } from "@/lib/ui-permissions";

export const Route = createFileRoute("/admin/api-settings/")({ component: ApiSettings });

type ToggleTarget = { provider: string; service: AdminAepsProviderService };

function ApiSettings() {
  const { can } = useEffectiveAccess();
  const privileged = getAdminActor()?.kind === "SUPER_ADMIN";
  const canView =
    privileged || can(UI_PERMISSION.AEPS_PROVIDER_STATUS_VIEW, ["SUPER_ADMIN", "ADMIN"]);
  const canUpdate =
    privileged || can(UI_PERMISSION.AEPS_PROVIDER_SERVICE_STATUS_UPDATE, ["SUPER_ADMIN", "ADMIN"]);
  const [data, setData] = useState<AdminAepsProviderStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [target, setTarget] = useState<ToggleTarget | null>(null);
  const [reason, setReason] = useState("");
  const [workspace, setWorkspace] = useState<"providers" | "twoFactor">("providers");

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setError("");
    try {
      setData(await adminApi.operations.aepsProviderStatus());
    } catch (value) {
      setError(messageOf(value));
    } finally {
      setLoading(false);
    }
  }, [canView]);

  useEffect(() => void load(), [load]);

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
      await load();
    } catch (value) {
      setError(messageOf(value));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminLayout
      active="api"
      eyebrow="Integrations"
      title="AEPS platform controls"
      description="Manage provider availability, daily 2FA fees and financial reconciliation from live backend contracts."
    >
      <div className="mb-5 flex w-fit max-w-full gap-1 overflow-x-auto rounded-2xl border border-border bg-white p-1">
        <button
          type="button"
          onClick={() => setWorkspace("providers")}
          className={`cursor-pointer whitespace-nowrap rounded-xl px-5 py-3 text-sm font-black ${workspace === "providers" ? "bg-secondary text-white" : "text-secondary"}`}
        >
          Provider services
        </button>
        {privileged ? (
          <button
            type="button"
            onClick={() => setWorkspace("twoFactor")}
            className={`cursor-pointer whitespace-nowrap rounded-xl px-5 py-3 text-sm font-black ${workspace === "twoFactor" ? "bg-secondary text-white" : "text-secondary"}`}
          >
            2FA fees &amp; reconciliation
          </button>
        ) : null}
      </div>
      {workspace === "twoFactor" && privileged ? (
        <SuperAdminAepsTwoFactor />
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
                  onClick={() => void load()}
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
                        <ProviderStatus value={provider.status} />
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
                                className={`rounded-full px-2 py-1 text-[10px] font-black ${
                                  service.isEnabled
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-red-50 text-red-700"
                                }`}
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
                      onChange={(event) => setReason(event.target.value)}
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
                  {busy ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <ShieldCheck size={18} />
                  )}
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

function ProviderStatus({ value }: { value: string }) {
  const good = value === "ENABLED";
  const bad = value === "DISABLED";
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${
        good
          ? "bg-emerald-50 text-emerald-700"
          : bad
            ? "bg-red-50 text-red-700"
            : "bg-amber-50 text-amber-700"
      }`}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}

function Banner({ tone, children }: { tone: "error" | "success"; children: React.ReactNode }) {
  return (
    <p
      className={`mb-4 rounded-xl p-3 text-sm font-semibold ${
        tone === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
      }`}
    >
      {children}
    </p>
  );
}

function messageOf(value: unknown) {
  return value instanceof Error ? value.message : "The provider request could not be completed.";
}
