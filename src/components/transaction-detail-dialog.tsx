import { useEffect, useState } from "react";
import { Loader2, Printer, ReceiptText, X } from "lucide-react";
import {
  operationsApi,
  operationsMessage,
  type ProviderTransaction,
  type ProviderTransactionReceipt,
} from "@/lib/operations-api";

type Props = { accessToken: string; referenceId: string | null; onClose: () => void };
const label = (key: string) =>
  key.replace(/([A-Z])/g, " $1").replace(/^./, (value) => value.toUpperCase());
const printable = (value: unknown) =>
  value === null || value === undefined || value === "" ? "—" : String(value);

export function TransactionDetailDialog({ accessToken, referenceId, onClose }: Props) {
  const [detail, setDetail] = useState<ProviderTransaction | null>(null);
  const [receipt, setReceipt] = useState<ProviderTransactionReceipt | null>(null);
  const [loading, setLoading] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!referenceId) return;
    setDetail(null);
    setReceipt(null);
    setError("");
    setLoading(true);
    operationsApi
      .transaction(accessToken, referenceId)
      .then(setDetail)
      .catch((reason) => setError(operationsMessage(reason)))
      .finally(() => setLoading(false));
  }, [accessToken, referenceId]);
  if (!referenceId) return null;
  async function loadReceipt() {
    setReceiptLoading(true);
    setError("");
    try {
      setReceipt(await operationsApi.receipt(accessToken, referenceId!));
    } catch (reason) {
      setError(operationsMessage(reason));
    } finally {
      setReceiptLoading(false);
    }
  }
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Transaction details"
      className="fixed inset-0 z-[100] grid place-items-center bg-secondary/60 p-4"
    >
      <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-primary">
              AEPS transaction
            </p>
            <h2 className="mt-1 break-all text-xl font-black text-secondary">{referenceId}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close transaction details"
            className="rounded-lg border border-border p-2"
          >
            <X size={18} />
          </button>
        </div>
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700"
          >
            {error}
          </p>
        )}
        {loading ? (
          <div className="grid h-40 place-items-center">
            <Loader2 className="animate-spin text-primary" />
          </div>
        ) : (
          detail && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(detail)
                .filter(
                  ([, value]) => value !== null && value !== undefined && typeof value !== "object",
                )
                .map(([key, value]) => (
                  <div key={key} className="rounded-xl bg-muted/60 p-3">
                    <p className="text-[10px] font-extrabold uppercase text-muted-foreground">
                      {label(key)}
                    </p>
                    <p className="mt-1 break-all text-xs font-bold text-secondary">
                      {printable(value)}
                    </p>
                  </div>
                ))}
            </div>
          )
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={receiptLoading}
            onClick={() => void loadReceipt()}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-extrabold text-white disabled:opacity-50"
          >
            {receiptLoading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <ReceiptText size={15} />
            )}
            View receipt
          </button>
          {receipt && (
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-xs font-extrabold"
            >
              <Printer size={15} />
              Print receipt
            </button>
          )}
        </div>
        {receipt && (
          <div id="transaction-receipt" className="mt-5 rounded-2xl border-2 border-secondary p-5">
            <div className="border-b border-border pb-4 text-center">
              <h3 className="text-xl font-black">UMOBIPAY</h3>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                AEPS transaction receipt
              </p>
            </div>
            <div className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {Object.entries(receipt)
                .filter(([, value]) => value !== null && value !== undefined)
                .map(([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between gap-3 border-b border-dashed border-border py-2 text-xs"
                  >
                    <span className="text-muted-foreground">{label(key)}</span>
                    <strong className="break-all text-right">{printable(value)}</strong>
                  </div>
                ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
