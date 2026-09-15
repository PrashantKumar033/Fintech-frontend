import { useEffect, useState } from "react";
import { Loader2, Printer, ReceiptText, X } from "lucide-react";
import {
  operationsApi,
  operationsMessage,
  type ProviderTransaction,
  type ProviderTransactionReceipt,
} from "@/lib/operations-api";

type Props = {
  accessToken: string;
  referenceId: string | null;
  onClose: () => void;
  scope?: "self" | "network";
};
const operationLabels: Record<string, string> = {
  BE: "Balance enquiry",
  MS: "Mini statement",
  CW: "Cash withdrawal",
  AP: "Aadhaar Pay",
  CD: "Cash deposit",
};

const transactionFields: Array<{ key: keyof ProviderTransaction; label: string }> = [
  { key: "referenceId", label: "Transaction reference" },
  { key: "operation", label: "Service" },
  { key: "amount", label: "Amount" },
  { key: "status", label: "Status" },
  { key: "provider", label: "Service provider" },
  { key: "rrn", label: "Bank reference (RRN)" },
  { key: "npciMessage", label: "Transaction result" },
  { key: "aadhaarLast4", label: "Aadhaar number" },
  { key: "settlementStatus", label: "Settlement" },
  { key: "commissionStatus", label: "Commission" },
  { key: "commissionAmount", label: "Commission amount" },
  { key: "createdAt", label: "Started at" },
  { key: "completedAt", label: "Completed at" },
];

const receiptFields: Array<{ key: keyof ProviderTransactionReceipt; label: string }> = [
  { key: "transactionTypeLabel", label: "Service" },
  { key: "transactionReferenceId", label: "Transaction reference" },
  { key: "status", label: "Status" },
  { key: "statusDescription", label: "Transaction result" },
  { key: "amount", label: "Amount" },
  { key: "transactionDateTime", label: "Date and time" },
  { key: "rrn", label: "Bank reference (RRN)" },
  { key: "maskedAadhaar", label: "Aadhaar number" },
  { key: "availableBalance", label: "Available balance" },
  { key: "reversed", label: "Reversal status" },
  { key: "reversedAt", label: "Reversed at" },
];

function displayValue(key: string, value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (key === "operation" || key === "transactionType") {
    return operationLabels[String(value)] || String(value);
  }
  if (["amount", "commissionAmount", "availableBalance"].includes(key)) {
    const amount = Number(value);
    return Number.isFinite(amount)
      ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount)
      : String(value);
  }
  if (["createdAt", "completedAt", "transactionDateTime", "reversedAt"].includes(key)) {
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("en-IN");
  }
  if (key === "aadhaarLast4") return `XXXX XXXX ${String(value).slice(-4)}`;
  if (key === "reversed") return value ? "Reversed" : "Not reversed";
  return String(value).replaceAll("_", " ");
}

export function TransactionDetailDialog({
  accessToken,
  referenceId,
  onClose,
  scope = "self",
}: Props) {
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
    const request =
      scope === "network"
        ? operationsApi.networkTransaction(accessToken, referenceId)
        : operationsApi.transaction(accessToken, referenceId);
    request
      .then(setDetail)
      .catch((reason) => setError(operationsMessage(reason)))
      .finally(() => setLoading(false));
  }, [accessToken, referenceId, scope]);
  if (!referenceId) return null;
  async function loadReceipt() {
    setReceiptLoading(true);
    setError("");
    try {
      setReceipt(
        await (scope === "network"
          ? operationsApi.networkReceipt(accessToken, referenceId!)
          : operationsApi.receipt(accessToken, referenceId!)),
      );
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
              {transactionFields
                .filter(({ key }) => detail[key] !== null && detail[key] !== undefined)
                .map(({ key, label }) => (
                  <div key={key} className="rounded-xl bg-muted/60 p-3">
                    <p className="text-[10px] font-extrabold uppercase text-muted-foreground">
                      {label}
                    </p>
                    <p className="mt-1 break-all text-xs font-bold text-secondary">
                      {displayValue(key, detail[key])}
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
              {receiptFields
                .filter(({ key }) => receipt[key] !== null && receipt[key] !== undefined)
                .map(({ key, label }) => (
                  <div
                    key={key}
                    className="flex justify-between gap-3 border-b border-dashed border-border py-2 text-xs"
                  >
                    <span className="text-muted-foreground">{label}</span>
                    <strong className="break-all text-right">
                      {displayValue(key, receipt[key])}
                    </strong>
                  </div>
                ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
