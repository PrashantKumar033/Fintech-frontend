import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  BadgeIndianRupee,
  CircleAlert,
  Eye,
  Loader2,
  PencilLine,
  Power,
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
import type { PayoutSourceWallet } from "@/lib/payout-api";

type Confirmation =
  { kind: "service"; nextEnabled: boolean } | { kind: "provider"; provider: ProviderRegistryEntry };

type SurchargeDraft = {
  type: "PERCENTAGE" | "FIXED";
  value: string;
};

const payoutWallets: PayoutSourceWallet[] = ["MAIN", "AEPS"];

export function SuperAdminPayoutControls() {
  const [service, setService] = useState<ServiceControlStatus | null>(null);
  const [providers, setProviders] = useState<ProviderRegistryEntry[]>([]);
  const [surcharges, setSurcharges] = useState<
    Partial<Record<PayoutSourceWallet, PayoutSurchargeConfiguration>>
  >({});
  const [surchargeDrafts, setSurchargeDrafts] = useState<
    Record<PayoutSourceWallet, SurchargeDraft>
  >({
    MAIN: { type: "PERCENTAGE", value: "" },
    AEPS: { type: "PERCENTAGE", value: "" },
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [surchargeEditorOpen, setSurchargeEditorOpen] = useState(false);
  const [surchargeError, setSurchargeError] = useState("");
  const [surchargeNotice, setSurchargeNotice] = useState("");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [providerDetail, setProviderDetail] = useState<ProviderRegistryEntry | null>(null);
  const [detailLoading, setDetailLoading] = useState("");
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const [serviceResult, providerResult, mainSurchargeResult, aepsSurchargeResult] =
      await Promise.allSettled([
        adminApi.superAdminPayout.serviceControl.get(),
        adminApi.superAdminPayout.providers.list(),
        adminApi.superAdminPayout.surcharge.get("MAIN"),
        adminApi.superAdminPayout.surcharge.get("AEPS"),
      ]);
    const errors: string[] = [];

    if (serviceResult.status === "fulfilled") setService(serviceResult.value);
    else errors.push(`Service: ${messageOf(serviceResult.reason)}`);

    if (providerResult.status === "fulfilled") setProviders(providerResult.value);
    else errors.push(`Providers: ${messageOf(providerResult.reason)}`);

    const surchargeResults = {
      MAIN: mainSurchargeResult,
      AEPS: aepsSurchargeResult,
    } as const;
    payoutWallets.forEach((sourceWallet) => {
      const result = surchargeResults[sourceWallet];
      if (result.status === "fulfilled") {
        const configuration = result.value;
        setSurcharges((current) => ({ ...current, [sourceWallet]: configuration }));
        setSurchargeDrafts((current) => ({
          ...current,
          [sourceWallet]: {
            type: configuration.type,
            value: String(Number(configuration.surchargeValue)),
          },
        }));
      } else {
        errors.push(`${sourceWallet} surcharge: ${messageOf(result.reason)}`);
      }
    });

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

  async function updateSurcharge(
    event: FormEvent<HTMLFormElement>,
    sourceWallet: PayoutSourceWallet,
  ) {
    event.preventDefault();
    const draft = surchargeDrafts[sourceWallet];
    const value = Number(draft.value);
    if (!Number.isFinite(value) || value < 0) {
      setSurchargeError(`${sourceWallet} wallet surcharge must be 0 or greater.`);
      return;
    }
    if (draft.type === "PERCENTAGE" && value > 100) {
      setSurchargeError(`${sourceWallet} wallet percentage surcharge cannot exceed 100.`);
      return;
    }

    setBusy(`surcharge-${sourceWallet}`);
    setSurchargeError("");
    setSurchargeNotice("");
    try {
      const next = await adminApi.superAdminPayout.surcharge.update(
        sourceWallet,
        draft.type,
        value,
      );
      setSurcharges((current) => ({ ...current, [sourceWallet]: next }));
      setSurchargeDrafts((current) => ({
        ...current,
        [sourceWallet]: {
          type: next.type,
          value: String(Number(next.surchargeValue)),
        },
      }));
      const successMessage = `${sourceWallet} wallet surcharge updated. New ${sourceWallet} settlements will use this configuration.`;
      setSurchargeNotice(successMessage);
      setNotice(successMessage);
    } catch (requestError) {
      setSurchargeError(messageOf(requestError));
    } finally {
      setBusy("");
    }
  }

  function openSurchargeEditor() {
    setSurchargeDrafts((current) => {
      const next = { ...current };
      payoutWallets.forEach((sourceWallet) => {
        const configuration = surcharges[sourceWallet];
        if (!configuration) return;
        next[sourceWallet] = {
          type: configuration.type,
          value: String(Number(configuration.surchargeValue)),
        };
      });
      return next;
    });
    setSurchargeError("");
    setSurchargeNotice("");
    setSurchargeEditorOpen(true);
  }

  async function viewProvider(publicCode: string) {
    setDetailLoading(publicCode);
    setError("");
    try {
      setProviderDetail(await adminApi.superAdminPayout.providers.get(publicCode));
    } catch (requestError) {
      setError(messageOf(requestError));
    } finally {
      setDetailLoading("");
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
          onClick={openSurchargeEditor}
          disabled={loading || Object.keys(surcharges).length === 0 || Boolean(busy)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PencilLine size={16} /> Edit payout surcharges
        </button>
      </div>

      {loading && !service && Object.keys(surcharges).length === 0 ? (
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
                      <div className="mt-4 grid grid-cols-[auto_1fr] gap-2">
                        <button
                          type="button"
                          disabled={Boolean(busy) || detailLoading === provider.publicCode}
                          onClick={() => void viewProvider(provider.publicCode)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm font-bold disabled:opacity-50"
                          aria-label={`View ${provider.publicName} details`}
                          title="View provider details"
                        >
                          {detailLoading === provider.publicCode ? (
                            <Loader2 className="animate-spin" size={15} />
                          ) : (
                            <Eye size={15} />
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={
                            Boolean(busy) ||
                            (!provider.isActive &&
                              provider.metadata?.integrationStatus !== "AVAILABLE")
                          }
                          onClick={() => {
                            setReason("");
                            setConfirmation({ kind: "provider", provider });
                          }}
                          className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-bold disabled:opacity-50 ${provider.isActive ? "border-red-200 text-red-700" : "border-emerald-200 text-emerald-700"}`}
                        >
                          <Power size={15} />{" "}
                          {provider.isActive
                            ? "Disable provider"
                            : provider.metadata?.integrationStatus === "AVAILABLE"
                              ? "Enable provider"
                              : "Integration unavailable"}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No payout provider is configured.</p>
                )}
              </div>
            </AdminPanel>

            <AdminPanel>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                    <BadgeIndianRupee size={20} />
                  </span>
                  <div>
                    <p className="text-xs font-black uppercase text-primary">Financial config</p>
                    <h2 className="text-xl font-black text-secondary">Payout surcharges</h2>
                  </div>
                </div>
                <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-black text-muted-foreground">
                  2 WALLETS
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Current charges applied independently to Main and AEPS wallet settlements.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {payoutWallets.map((sourceWallet) => {
                  const configuration = surcharges[sourceWallet];
                  return (
                    <div
                      key={sourceWallet}
                      className="rounded-2xl border border-border bg-gradient-to-br from-white to-muted/50 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">
                            Source wallet
                          </p>
                          <h3 className="mt-0.5 font-black text-secondary">
                            {sourceWallet === "MAIN" ? "Main wallet" : "AEPS wallet"}
                          </h3>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-black ${configuration?.isActive ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                        >
                          {configuration
                            ? configuration.isActive
                              ? "ACTIVE"
                              : "INACTIVE"
                            : "NOT LOADED"}
                        </span>
                      </div>
                      {configuration ? (
                        <>
                          <div className="mt-4 flex items-end justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">
                                Current surcharge
                              </p>
                              <p className="mt-1 text-2xl font-black text-secondary">
                                {configuration.type === "PERCENTAGE"
                                  ? `${Number(configuration.surchargeValue)}%`
                                  : new Intl.NumberFormat("en-IN", {
                                      style: "currency",
                                      currency: "INR",
                                      minimumFractionDigits: 2,
                                    }).format(Number(configuration.surchargeValue))}
                              </p>
                            </div>
                            <p className="rounded-lg bg-primary/10 px-2.5 py-1.5 text-[10px] font-black text-primary">
                              {configuration.type === "PERCENTAGE" ? "PERCENTAGE" : "FIXED AMOUNT"}
                            </p>
                          </div>
                          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs">
                            <div>
                              <p className="text-muted-foreground">Version</p>
                              <p className="mt-0.5 font-extrabold text-secondary">
                                v{configuration.version}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Last updated</p>
                              <p className="mt-0.5 font-extrabold text-secondary">
                                {new Date(configuration.updatedAt).toLocaleDateString("en-IN")}
                              </p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="mt-4 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                          Surcharge configuration is currently unavailable.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                Existing settlements retain their original surcharge snapshot when rates change.
              </p>
            </AdminPanel>
          </div>
        </div>
      )}

      {surchargeEditorOpen ? (
        <div className="fixed inset-0 z-[130] grid place-items-center bg-secondary/65 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="payout-surcharge-editor-title"
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-white/95 px-5 py-5 backdrop-blur sm:px-6">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <BadgeIndianRupee size={21} />
                </span>
                <div>
                  <p className="text-xs font-black uppercase text-primary">Payout controls</p>
                  <h2
                    id="payout-surcharge-editor-title"
                    className="mt-1 text-xl font-black text-secondary"
                  >
                    Edit payout surcharges
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Configure Main and AEPS wallet charges independently.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSurchargeEditorOpen(false)}
                disabled={Boolean(busy)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border text-muted-foreground transition hover:bg-muted hover:text-secondary disabled:opacity-50"
                aria-label="Close surcharge editor"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              {surchargeError ? (
                <p
                  role="alert"
                  className="flex gap-2 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700"
                >
                  <CircleAlert className="shrink-0" size={18} /> {surchargeError}
                </p>
              ) : null}
              {surchargeNotice ? (
                <p className="flex gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
                  <ShieldCheck className="shrink-0" size={18} /> {surchargeNotice}
                </p>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                {payoutWallets.map((sourceWallet) => {
                  const draft = surchargeDrafts[sourceWallet];
                  const configuration = surcharges[sourceWallet];
                  const busyKey = `surcharge-${sourceWallet}`;
                  return (
                    <form
                      key={sourceWallet}
                      onSubmit={(event) => void updateSurcharge(event, sourceWallet)}
                      className="flex flex-col rounded-2xl border border-border bg-muted/30 p-4 sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wide text-primary">
                            {sourceWallet} source
                          </p>
                          <h3 className="mt-1 text-lg font-black text-secondary">
                            {sourceWallet === "MAIN" ? "Main wallet" : "AEPS wallet"}
                          </h3>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-black ${configuration?.isActive ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                        >
                          {configuration?.isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </div>

                      <div className="mt-5 space-y-4">
                        <label className="block text-xs font-black uppercase text-secondary">
                          Calculation type
                          <select
                            value={draft.type}
                            disabled={Boolean(busy)}
                            onChange={(event) => {
                              setSurchargeError("");
                              setSurchargeNotice("");
                              setSurchargeDrafts((current) => ({
                                ...current,
                                [sourceWallet]: {
                                  ...current[sourceWallet],
                                  type: event.target.value as "PERCENTAGE" | "FIXED",
                                },
                              }));
                            }}
                            className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold normal-case outline-none focus:border-primary disabled:opacity-60"
                          >
                            <option value="PERCENTAGE">Percentage</option>
                            <option value="FIXED">Fixed amount</option>
                          </select>
                        </label>
                        <label className="block text-xs font-black uppercase text-secondary">
                          {draft.type === "PERCENTAGE" ? "Percentage value" : "Amount in INR"}
                          <div className="relative mt-2">
                            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm font-black text-muted-foreground">
                              {draft.type === "PERCENTAGE" ? "%" : "₹"}
                            </span>
                            <input
                              required
                              min="0"
                              max={draft.type === "PERCENTAGE" ? "100" : undefined}
                              step="0.01"
                              type="number"
                              inputMode="decimal"
                              value={draft.value}
                              disabled={Boolean(busy)}
                              onChange={(event) => {
                                setSurchargeError("");
                                setSurchargeNotice("");
                                setSurchargeDrafts((current) => ({
                                  ...current,
                                  [sourceWallet]: {
                                    ...current[sourceWallet],
                                    value: event.target.value,
                                  },
                                }));
                              }}
                              placeholder="0.00"
                              className="w-full rounded-xl border border-border bg-white py-3 pl-10 pr-4 text-sm font-semibold normal-case outline-none focus:border-primary disabled:opacity-60"
                            />
                          </div>
                        </label>
                      </div>

                      <div className="mt-4 rounded-xl bg-white p-3 text-xs text-muted-foreground">
                        {configuration ? (
                          <>
                            Active version <strong>v{configuration.version}</strong> · Updated{" "}
                            {new Date(configuration.updatedAt).toLocaleString("en-IN")}
                          </>
                        ) : (
                          "No active configuration was loaded for this wallet."
                        )}
                      </div>

                      <button
                        disabled={Boolean(busy) || !configuration}
                        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-black text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {busy === busyKey ? (
                          <Loader2 className="animate-spin" size={17} />
                        ) : (
                          <Save size={17} />
                        )}
                        {busy === busyKey ? "Saving surcharge" : `Save ${sourceWallet} surcharge`}
                      </button>
                    </form>
                  );
                })}
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-xl text-xs leading-5 text-muted-foreground">
                  Updated rates apply only to new settlements. Existing settlements keep the
                  surcharge captured when they were created.
                </p>
                <button
                  type="button"
                  onClick={() => setSurchargeEditorOpen(false)}
                  disabled={Boolean(busy)}
                  className="shrink-0 rounded-xl border border-border px-5 py-2.5 text-sm font-bold text-secondary transition hover:bg-muted disabled:opacity-50"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

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

      {providerDetail ? (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-secondary/65 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase text-primary">Payout provider detail</p>
                <h2 className="mt-1 text-xl font-black text-secondary">
                  {providerDetail.publicName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setProviderDetail(null)}
                className="grid h-9 w-9 place-items-center rounded-xl border border-border"
                aria-label="Close provider detail"
              >
                <X size={17} />
              </button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ["Public code", providerDetail.publicCode],
                ["Public name", providerDetail.publicName],
                ["Internal mapping", providerDetail.internalCode || "—"],
                ["Display name", providerDetail.displayName || "—"],
                ["Service", providerDetail.serviceType],
                ["Status", providerDetail.isActive ? "ACTIVE" : "INACTIVE"],
                ["Updated by", providerDetail.updatedBy || "—"],
                [
                  "Updated at",
                  providerDetail.updatedAt
                    ? new Date(providerDetail.updatedAt).toLocaleString("en-IN")
                    : "—",
                ],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-muted p-4">
                  <p className="text-[10px] font-black uppercase text-muted-foreground">{label}</p>
                  <p className="mt-1 break-all text-sm font-extrabold text-secondary">{value}</p>
                </div>
              ))}
            </div>
            {providerDetail.metadata ? (
              <div className="mt-4 rounded-2xl border border-border p-4">
                <p className="text-[10px] font-black uppercase text-muted-foreground">
                  Integration metadata
                </p>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all text-xs text-secondary">
                  {JSON.stringify(providerDetail.metadata, null, 2)}
                </pre>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

function messageOf(value: unknown): string {
  return value instanceof Error ? value.message : "The payout control request failed.";
}
