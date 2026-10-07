import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LoaderCircle, RefreshCw, X } from "lucide-react";
import { BusinessPage } from "@/components/business-page";
import { getSession } from "@/lib/auth-api";
import { operationsApi, operationsMessage, type WalletLedgerEntry } from "@/lib/operations-api";
import { credentialsPending, resolveWorkspaceRole, signedInHome } from "@/lib/role-hierarchy";

export const Route = createFileRoute("/retailer/wallet/history")({ component: WalletHistoryPage });

type LedgerDetail = WalletLedgerEntry & { sequence: string; updatedAt: string; description?: string | null; externalReference?: string | null };

function WalletHistoryPage() {
  const navigate = useNavigate();
  const session = getSession();
  const [items, setItems] = useState<WalletLedgerEntry[]>([]);
  const [walletType, setWalletType] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<LedgerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  async function load() {
    if (!session) return;
    setLoading(true);
    setError("");
    try {
      const page = await operationsApi.walletTransactions(session.accessToken, {
        limit: 50,
        walletType: walletType || undefined,
      });
      setItems(page.data || []);
    } catch (value) {
      setError(operationsMessage(value));
    } finally {
      setLoading(false);
    }
  }

  async function openDetail(referenceId: string) {
    if (!session) return;
    setDetailLoading(true);
    setDetail(null);
    try {
      const entry = await operationsApi.transactionLedgerEntry(session.accessToken, referenceId);
      setDetail(entry);
    } catch (err) {
      setError(operationsMessage(err));
    } finally {
      setDetailLoading(false);
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
    void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [navigate, session?.identity.id, walletType]);

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
      eyebrow="Wallet ledger"
      title="Wallet history"
      description="Every MAIN, AEPS and PROFIT credit or debit with its resulting balance."
    >
      {error ? (
        <p className="mb-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>
      ) : null}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <select
            value={walletType}
            onChange={(e) => setWalletType(e.target.value)}
            className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
          >
            <option value="">All wallets</option>
            <option>MAIN</option>
            <option>AEPS</option>
            <option>PROFIT</option>
          </select>
          <button
            onClick={() => void load()}
            disabled={loading}
            className="rounded-xl border border-border p-2.5"
          >
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                <th className="p-3">Date</th>
                <th className="p-3">Title</th>
                <th className="p-3">Wallet</th>
                <th className="p-3">Type</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Closing balance</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={`${item.referenceId}-${item.walletType}-${item.type}`}
                  onClick={() => void openDetail(item.referenceId)}
                  className="cursor-pointer border-b border-border/60 hover:bg-muted/40"
                >
                  <td className="p-3">{new Date(item.createdAt).toLocaleString("en-IN")}</td>
                  <td className="p-3">
                    <strong>{item.title}</strong>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {item.referenceId}
                    </p>
                  </td>
                  <td className="p-3">{item.walletType}</td>
                  <td
                    className={`p-3 font-bold ${item.type === "CREDIT" ? "text-emerald-700" : "text-red-600"}`}
                  >
                    {item.type}
                  </td>
                  <td className="p-3 font-bold">₹{Number(item.amount).toFixed(2)}</td>
                  <td className="p-3">₹{Number(item.closingBalance).toFixed(2)}</td>
                  <td className="p-3">{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !items.length ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No wallet transactions found.
            </p>
          ) : null}
        </div>
      </section>

      {(detailLoading || detail) && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-secondary/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-black">Transaction detail</h2>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="rounded-xl border border-border p-2"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            {detailLoading ? (
              <div className="flex justify-center py-10">
                <LoaderCircle className="animate-spin text-primary" size={28} />
              </div>
            ) : detail ? (
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                {([
                  ["Reference", detail.referenceId],
                  ["Wallet", detail.walletType],
                  ["Service", detail.serviceType],
                  ["Type", detail.type],
                  ["Amount", `₹${Number(detail.amount).toFixed(2)}`],
                  ["Opening balance", `₹${Number(detail.openingBalance).toFixed(2)}`],
                  ["Closing balance", `₹${Number(detail.closingBalance).toFixed(2)}`],
                  ["Status", detail.status],
                  ["Description", detail.description || "—"],
                  ["External ref", detail.externalReference || "—"],
                  ["Date", new Date(detail.createdAt).toLocaleString("en-IN")],
                ] as [string, string][]).map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-muted/60 p-3">
                    <dt className="text-[10px] font-black uppercase text-muted-foreground">{label}</dt>
                    <dd className="mt-1 break-all text-sm font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </div>
      )}
    </BusinessPage>
  );
}
