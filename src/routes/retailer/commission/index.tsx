import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CircleDollarSign, Clock3, RefreshCw, WalletCards } from "lucide-react";
import { BusinessPage, ServiceNotice } from "@/components/business-page";
import { getSession } from "@/lib/auth-api";
import { credentialsPending, signedInHome } from "@/lib/role-hierarchy";
import {
  operationsApi,
  operationsMessage,
  type ProviderTransactionPage,
} from "@/lib/operations-api";

export const Route = createFileRoute("/retailer/commission/")({
  head: () => ({ meta: [{ title: "Commission — UMOBIPAY" }] }),
  component: CommissionPage,
});

const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value) || 0);

function CommissionPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<ReturnType<typeof getSession>>(null);
  const [page, setPage] = useState<ProviderTransactionPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (token: string) => {
    setLoading(true);
    setError("");
    try {
      setPage(await operationsApi.transactions(token, { page: 1, limit: 100 }));
    } catch (value) {
      setError(operationsMessage(value));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const current = getSession();
    if (!current) {
      void navigate({ to: "/login" });
      return;
    }
    if (credentialsPending(current.identity)) {
      window.location.replace(signedInHome(current));
      return;
    }
    setSession(current);
  }, [navigate]);

  useEffect(() => {
    if (session) void load(session.accessToken);
  }, [load, session]);

  const rows = useMemo(
    () => (page?.data ?? []).filter((row) => row.commissionStatus || row.commissionAmount != null),
    [page],
  );
  const settled = rows.filter((row) => row.commissionStatus === "SETTLED");
  const pending = rows.filter(
    (row) => row.commissionStatus && !["SETTLED", "NOT_REQUIRED"].includes(row.commissionStatus),
  );
  const settledTotal = settled.reduce((sum, row) => sum + (Number(row.commissionAmount) || 0), 0);
  const pendingTotal = pending.reduce((sum, row) => sum + (Number(row.commissionAmount) || 0), 0);

  if (!session)
    return (
      <div className="grid min-h-screen place-items-center">
        <RefreshCw className="animate-spin text-primary" />
      </div>
    );

  return (
    <BusinessPage
      identity={session.identity}
      active="commission"
      eyebrow="Earnings"
      title="Commission"
      description="Track commission credited from your AEPS transactions and items still being processed."
    >
      {error ? (
        <div className="mb-5">
          <ServiceNotice ok={false}>{error}</ServiceNotice>
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3">
        <Summary icon={WalletCards} label="Commission credited" value={money(settledTotal)} />
        <Summary icon={Clock3} label="Commission pending" value={money(pendingTotal)} />
        <Summary
          icon={CircleDollarSign}
          label="Commission transactions"
          value={String(rows.length)}
        />
      </div>
      <section className="mt-5 overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h2 className="text-xl font-black text-secondary">Commission history</h2>
            <p className="text-xs text-muted-foreground">
              Amounts are read from your protected AEPS transaction records.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load(session.accessToken)}
            disabled={loading}
            className="rounded-xl border border-border p-3"
            title="Refresh commission"
          >
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
        {loading ? (
          <div className="grid h-48 place-items-center">
            <RefreshCw className="animate-spin text-primary" />
          </div>
        ) : rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-xs">
              <thead className="bg-muted text-[10px] uppercase text-muted-foreground">
                <tr>
                  {[
                    "Reference",
                    "Provider reference",
                    "Operation",
                    "Transaction amount",
                    "Commission",
                    "Commission status",
                    "Created",
                  ].map((label) => (
                    <th key={label} className="px-5 py-3">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id || row.referenceId} className="border-t border-border">
                    <td className="px-5 py-4 font-bold text-primary">{row.referenceId}</td>
                    <td className="px-5 py-4 font-mono text-[11px]">
                      {row.providerReference || row.providerTxnRefId || "—"}
                    </td>
                    <td className="px-5 py-4">{row.operation}</td>
                    <td className="px-5 py-4">{money(row.amount)}</td>
                    <td className="px-5 py-4 font-extrabold">{money(row.commissionAmount)}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-mint px-2.5 py-1 font-bold">
                        {(row.commissionStatus || "PENDING").replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-4">{new Date(row.createdAt).toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid h-48 place-items-center text-sm text-muted-foreground">
            No commission-bearing transactions found.
          </div>
        )}
      </section>
    </BusinessPage>
  );
}

function Summary({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof WalletCards;
  label: string;
  value: string;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <Icon className="text-primary" size={22} />
      <p className="mt-4 text-xs font-bold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-black text-secondary">{value}</p>
    </section>
  );
}
