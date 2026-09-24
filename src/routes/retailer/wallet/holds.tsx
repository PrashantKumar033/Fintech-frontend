import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { BusinessPage } from "@/components/business-page";
import { getSession } from "@/lib/auth-api";
import { operationsApi, operationsMessage } from "@/lib/operations-api";
import { credentialsPending, resolveWorkspaceRole, signedInHome } from "@/lib/role-hierarchy";

export const Route = createFileRoute("/retailer/wallet/holds")({
  component: RetailerWalletHoldsPage,
});

type HoldItem = {
  id: string;
  referenceId: string;
  walletType: string;
  amount: string;
  reason: string;
  status: string;
  resolutionReason?: string | null;
  releasedAt?: string | null;
  createdAt: string;
};

function RetailerWalletHoldsPage() {
  const navigate = useNavigate();
  const session = getSession();
  const [items, setItems] = useState<HoldItem[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    if (!session) return;
    setLoading(true);
    setError("");
    try {
      const result = await operationsApi.walletHolds(session.accessToken, {
        status: status || undefined,
        limit: 50,
      });
      setItems(result.data ?? []);
    } catch (err) {
      setError(operationsMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!session) return void navigate({ to: "/login" });
    if (
      resolveWorkspaceRole(session.identity.role) !== "RETAILER" ||
      credentialsPending(session.identity)
    ) {
      window.location.replace(signedInHome(session));
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, session?.identity.id, status]);

  if (!session)
    return (
      <div className="grid min-h-screen place-items-center">
        <LoaderCircle className="animate-spin" />
      </div>
    );

  return (
    <BusinessPage
      identity={session.identity}
      active="wallet"
      eyebrow="Wallet"
      title="Wallet holds"
      description="Funds temporarily frozen on your MAIN wallet by the platform."
    >
      {error ? (
        <p className="mb-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>
      ) : null}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="RELEASED">Released</option>
            <option value="SETTLED">Settled</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="EXPIRED">Expired</option>
          </select>
          <button
            onClick={() => void load()}
            disabled={loading}
            className="rounded-xl border border-border p-2.5"
            aria-label="Refresh holds"
          >
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                <th className="p-3">Date</th>
                <th className="p-3">Reference</th>
                <th className="p-3">Wallet</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Reason</th>
                <th className="p-3">Status</th>
                <th className="p-3">Released at</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border/60">
                  <td className="p-3 text-xs">{new Date(item.createdAt).toLocaleString("en-IN")}</td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">{item.referenceId}</td>
                  <td className="p-3">{item.walletType}</td>
                  <td className="p-3 font-bold">₹{Number(item.amount).toFixed(2)}</td>
                  <td className="p-3 max-w-[200px] truncate" title={item.reason}>{item.reason}</td>
                  <td className="p-3">
                    <HoldStatus value={item.status} />
                  </td>
                  <td className="p-3 text-xs">
                    {item.releasedAt ? new Date(item.releasedAt).toLocaleString("en-IN") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !items.length ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No wallet holds found.</p>
          ) : null}
        </div>
      </section>
    </BusinessPage>
  );
}

function HoldStatus({ value }: { value: string }) {
  const v = value.toUpperCase();
  const cls =
    v === "ACTIVE"
      ? "bg-amber-50 text-amber-700"
      : v === "RELEASED" || v === "SETTLED"
        ? "bg-emerald-50 text-emerald-700"
        : "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black ${cls}`}>
      {value}
    </span>
  );
}
