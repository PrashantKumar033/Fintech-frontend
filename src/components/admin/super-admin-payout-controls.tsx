import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  BadgeIndianRupee,
  CircleAlert,
  Loader2,
  Power,
  RefreshCw,
  Save,
  ServerCog,
  ShieldCheck,
  X,
} from "lucide-react";
import { AdminPanel } from "@/components/admin/admin-layout";
import {
  adminApi,
  type PayoutSurchargeConfiguration,
  type ProviderRegistryEntry,
  type ServiceControlStatus,
} from "@/lib/admin-api";

type Confirmation =
  { kind: "service"; nextEnabled: boolean } | { kind: "provider"; provider: ProviderRegistryEntry };

export function SuperAdminPayoutControls() {
  const [service, setService] = useState<ServiceControlStatus | null>(null);
  const [providers, setProviders] = useState<ProviderRegistryEntry[]>([]);
  const [surcharge, setSurcharge] = useState<PayoutSurchargeConfiguration | null>(null);
  const [surchargeType, setSurchargeType] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");
  const [surchargeValue, setSurchargeValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const [serviceResult, providerResult, surchargeResult] = await Promise.allSettled([
      adminApi.superAdminPayout.serviceControl.get(),
      adminApi.superAdminPayout.providers.list(),
      adminApi.superAdminPayout.surcharge.get(),
    ]);
    const errors: string[] = [];

    if (serviceResult.status === "fulfilled") setService(serviceResult.value);
    else errors.push(`Service: ${messageOf(serviceResult.reason)}`);

    if (providerResult.status === "fulfilled") setProviders(providerResult.value);
    else errors.push(`Providers: ${messageOf(providerResult.reason)}`);

    if (surchargeResult.status === "fulfilled") {
      setSurcharge(surchargeResult.value);
      setSurchargeType(surchargeResult.value.type);
      setSurchargeValue(String(Number(surchargeResult.value.surchargeValue)));
    } else {
      errors.push(`Surcharge: ${messageOf(surchargeResult.reason)}`);
    }

    if (errors.length) setError(errors.join(" "));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function applyConfirmation() {
    if (!confirmation) return;
    if (confirmation.kind === "service" && !confirmation.nextEnabled && !reason.trim()) {
      setError("Enter a reason before disabling payout platform-wide.");
      return;
    }

    setBusy(confirmation.kind);
    setError("");
    setNotice("");
    try {
      if (confirmation.kind === "service") {
        await adminApi.superAdminPayout.serviceControl.update(
          confirmation.nextEnabled,
          confirmation.nextEnabled ? undefined : reason,
        );
        setNotice(
          `Payout service ${confirmation.nextEnabled ? "enabled" : "disabled"} platform-wide.`,
        );
      } else {
        const provider = confirmation.provider;
        await adminApi.superAdminPayout.providers.updateStatus(
          provider.publicCode,
          !provider.isActive,
        );
        setNotice(
          `${provider.publicName} ${provider.isActive ? "disabled" : "enabled"} for payout.`,
        );
      }
      setConfirmation(null);
      setReason("");
      await load();
    } catch (requestError) {
      setError(messageOf(requestError));
    } finally {
      setBusy("");
    }
  }

  async function updateSurcharge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(surchargeValue);
    if (!Number.isFinite(value) || value < 0) {
      setError("Surcharge value must be 0 or greater.");
      return;
    }
    if (surchargeType === "PERCENTAGE" && value > 100) {
      setError("Percentage surcharge cannot exceed 100.");
      return;
    }

    setBusy("surcharge");
    setError("");
    setNotice("");
    try {
      const next = await adminApi.superAdminPayout.surcharge.update(surchargeType, value);
      setSurcharge(next);
      setSurchargeType(next.type);
      setSurchargeValue(String(Number(next.surchargeValue)));
      setNotice("Payout surcharge updated. New settlements will use this configuration.");
    } catch (requestError) {
      setError(messageOf(requestError));
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      {error ? (
        <p className="mb-4 flex gap-2 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
          <CircleAlert className="shrink-0" size={18} /> {error}
        </p>
      ) : null}
      {notice ? (
        <p className="mb-4 flex gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
          <ShieldCheck className="shrink-0" size={18} /> {notice}
        </p>
      ) : null}

      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-bold disabled:opacity-50"
        >
          <RefreshCw className={loading ? "animate-spin" : ""} size={16} /> Refresh payout
        </button>
      </div>

      {loading && !service && !surcharge ? (
        <AdminPanel className="grid min-h-64 place-items-center">
          <Loader2 className="animate-spin text-primary" />
        </AdminPanel>
      ) : (
        <div className="space-y-5">
          <AdminPanel>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <ServerCog size={21} />
                </span>
                <div>
                  <p className="text-xs font-black uppercase text-primary">Payout master switch</p>
                  <h2 className="mt-1 text-xl font-black text-secondary">Platform availability</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    This switch is enforced before every provider payout request.
                  </p>
                  {service?.disabledReason ? (
                    <p className="mt-2 text-xs font-semibold text-red-700">
                      {service.disabledReason}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-black ${service?.isEnabled ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
                >
                  {service?.isEnabled ? "ENABLED" : "DISABLED"}
                </span>
                <button
                  type="button"
                  disabled={!service || Boolean(busy)}
                  onClick={() => {
                    setReason("");
                    setConfirmation({ kind: "service", nextEnabled: !service?.isEnabled });
                  }}
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold disabled:opacity-50 ${service?.isEnabled ? "border-red-200 text-red-700" : "border-emerald-200 text-emerald-700"}`}
                >
                  <Power size={16} /> {service?.isEnabled ? "Disable" : "Enable"}
                </button>
              </div>
            </div>
          </AdminPanel>

          <div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
            <AdminPanel>
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Power size={20} />
                </span>
                <div>
                  <p className="text-xs font-black uppercase text-primary">Provider routing</p>
                  <h2 className="text-xl font-black text-secondary">Payout providers</h2>
                </div>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {providers.length ? (
                  providers.map((provider) => (
                    <div key={provider.publicCode} className="rounded-2xl border border-border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-black text-secondary">{provider.publicName}</h3>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {provider.publicCode} · {provider.serviceType}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-black ${provider.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
                        >
                          {provider.isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </div>
                      {typeof provider.metadata?.integrationStatus === "string" ? (
                        <p className="mt-3 text-xs font-semibold text-amber-700">
                          Integration: {provider.metadata.integrationStatus.replaceAll("_", " ")}
                        </p>
                      ) : null}
                      <button
                        type="button"
                        disabled={Boolean(busy)}
                        onClick={() => {
                          setReason("");
                          setConfirmation({ kind: "provider", provider });
                        }}
                        className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-bold disabled:opacity-50 ${provider.isActive ? "border-red-200 text-red-700" : "border-emerald-200 text-emerald-700"}`}
                      >
                        <Power size={15} />{" "}
                        {provider.isActive ? "Disable provider" : "Enable provider"}
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No payout provider is configured.</p>
                )}
              </div>
            </AdminPanel>

            <AdminPanel>
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                  <BadgeIndianRupee size={20} />
                </span>
                <div>
                  <p className="text-xs font-black uppercase text-primary">Financial config</p>
                  <h2 className="text-xl font-black text-secondary">Surcharge</h2>
                </div>
              </div>
              <form onSubmit={updateSurcharge} className="mt-5 space-y-4">
                <label className="block text-xs font-black uppercase text-secondary">
                  Calculation type
                  <select
                    value={surchargeType}
                    onChange={(event) =>
                      setSurchargeType(event.target.value as "PERCENTAGE" | "FIXED")
                    }
                    className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold normal-case outline-none focus:border-primary"
                  >
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FIXED">Fixed amount</option>
                  </select>
                </label>
                <label className="block text-xs font-black uppercase text-secondary">
                  {surchargeType === "PERCENTAGE" ? "Percentage value" : "Amount in INR"}
                  <input
                    required
                    inputMode="decimal"
                    value={surchargeValue}
                    onChange={(event) =>
                      setSurchargeValue(event.target.value.replace(/[^0-9.]/g, ""))
                    }
                    placeholder="0.00"
                    className="mt-2 w-full rounded-xl border border-border px-4 py-3 text-sm font-semibold normal-case outline-none focus:border-primary"
                  />
                </label>
                {surcharge ? (
                  <p className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">
                    Active version {surcharge.version}. Existing settlements keep their original
                    surcharge snapshot.
                  </p>
                ) : null}
                <button
                  disabled={busy === "surcharge"}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-black text-white disabled:opacity-50"
                >
                  {busy === "surcharge" ? (
                    <Loader2 className="animate-spin" size={17} />
                  ) : (
                    <Save size={17} />
                  )}
                  Save surcharge
                </button>
              </form>
            </AdminPanel>
          </div>
        </div>
      )}

      {confirmation ? (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-secondary/65 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase text-primary">Payout control</p>
                <h2 className="mt-1 text-xl font-black text-secondary">
                  {confirmation.kind === "service"
                    ? `${confirmation.nextEnabled ? "Enable" : "Disable"} payout service`
                    : `${confirmation.provider.isActive ? "Disable" : "Enable"} ${confirmation.provider.publicName}`}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setConfirmation(null)}
                disabled={Boolean(busy)}
                className="grid h-9 w-9 place-items-center rounded-xl border border-border"
              >
                <X size={17} />
              </button>
            </div>

            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-900">
              {confirmation.kind === "service"
                ? "This changes payout availability for every account immediately. In-flight callbacks remain available."
                : "This changes routing availability for new payout settlements. In-flight callbacks are not blocked."}
            </p>

            {confirmation.kind === "service" && !confirmation.nextEnabled ? (
              <label className="mt-4 block text-xs font-black uppercase text-secondary">
                Disable reason
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-border p-3 text-sm font-normal normal-case outline-none focus:border-primary"
                  placeholder="Explain why payout is being disabled"
                />
              </label>
            ) : null}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConfirmation(null)}
                disabled={Boolean(busy)}
                className="rounded-xl border border-border py-3 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void applyConfirmation()}
                disabled={Boolean(busy)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-black text-white disabled:opacity-50"
              >
                {busy ? <Loader2 className="animate-spin" size={17} /> : <ShieldCheck size={17} />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function messageOf(value: unknown): string {
  return value instanceof Error ? value.message : "The payout control request failed.";
}
