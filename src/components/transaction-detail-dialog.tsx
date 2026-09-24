import { useEffect, useState } from "react";
import { Loader2, Printer, ReceiptText, X } from "lucide-react";
import {
  operationsApi,
  operationsMessage,
  type ProviderTransaction,
  type ProviderTransactionReceipt,
} from "@/lib/operations-api";
import { compactTransactionReference } from "@/lib/transaction-display";

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

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function printTransactionReceipt(receipt: ProviderTransactionReceipt) {
  const printableRows: Array<[string, unknown, keyof ProviderTransactionReceipt]> = [
    ["Service", receipt.transactionTypeLabel, "transactionTypeLabel"],
    ["Provider", receipt.provider, "provider"],
    ["Transaction reference", receipt.transactionReferenceId, "transactionReferenceId"],
    ["Bank reference (RRN)", receipt.rrn, "rrn"],
    ["Acknowledgement no.", receipt.ackNo, "ackNo"],
    ["Client reference", receipt.clientRefNo, "clientRefNo"],
    ["Aadhaar number", receipt.maskedAadhaar, "maskedAadhaar"],
    ["Bank IIN", receipt.bankIIN, "bankIIN"],
    ["Transaction result", receipt.statusDescription || receipt.npciMessage, "statusDescription"],
    ["NPCI response code", receipt.npciCode, "npciCode"],
    ["Date and time", receipt.transactionDateTime, "transactionDateTime"],
    ["Available balance", receipt.availableBalance, "availableBalance"],
    ["Reversal status", receipt.reversed, "reversed"],
    ["Reversed at", receipt.reversedAt, "reversedAt"],
  ];
  const rows = printableRows
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(
      ([label, value, key]) => `
        <div class="row">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(displayValue(key, value))}</strong>
        </div>`,
    )
    .join("");
  const amount = escapeHtml(displayValue("amount", receipt.amount));
  const status = escapeHtml(displayValue("status", receipt.status));
  const successful = receipt.status === "SUCCESS";
  const printWindow = window.open("", "_blank", "popup,width=1050,height=850");
  if (!printWindow) throw new Error("Allow pop-ups to print the transaction receipt.");

  printWindow.document.write(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>UMOBIPAY receipt - ${escapeHtml(receipt.transactionReferenceId)}</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; background: #eef6f3; color: #053d38; font: 13px/1.45 Arial, sans-serif; }
      .receipt { width: min(794px, calc(100% - 48px)); min-height: 1040px; margin: 24px auto; padding: 46px 52px; background: #fff; border: 1px solid #b8d8d1; box-shadow: 0 12px 35px rgba(0, 70, 61, .14); }
      .brand { text-align: center; border-bottom: 2px solid #00675d; padding-bottom: 15px; }
      .brand h1 { margin: 0; color: #00675d; font-size: 25px; letter-spacing: 1.2px; }
      .brand p { margin: 3px 0 0; color: #ff6422; font-size: 10px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; }
      .copy { margin-top: 8px; color: #607a76; font-size: 10px; text-transform: uppercase; }
      .summary { padding: 20px 0 15px; text-align: center; border-bottom: 1px dashed #9dbdb7; }
      .amount-label { color: #607a76; font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
      .amount { margin: 5px 0 8px; color: #043f39; font-size: 31px; font-weight: 800; }
      .status { display: inline-block; padding: 5px 12px; border-radius: 20px; background: ${successful ? "#e2f8ed" : "#fff0e8"}; color: ${successful ? "#087443" : "#b43b08"}; font-size: 10px; font-weight: 800; letter-spacing: .6px; }
      .details { display: grid; grid-template-columns: 1fr 1fr; column-gap: 36px; padding-top: 14px; }
      .row { display: flex; justify-content: space-between; gap: 18px; min-width: 0; padding: 11px 0; border-bottom: 1px dashed #d3e3df; }
      .row span { flex: 0 0 42%; color: #607a76; }
      .row strong { overflow-wrap: anywhere; text-align: right; }
      .footer { padding-top: 18px; text-align: center; }
      .footer strong { display: block; color: #00675d; }
      .footer p { margin: 5px 0 0; color: #718783; font-size: 10px; }
      .generated { margin-top: 14px !important; border-top: 1px solid #dbe8e5; padding-top: 10px; }
      @page { size: A4 portrait; margin: 14mm; }
      @media print {
        html, body { width: 182mm; min-height: 269mm; background: #fff; }
        .receipt { width: 182mm; min-height: 269mm; margin: 0; padding: 8mm 10mm; border: 1px solid #b8d8d1; box-shadow: none; break-inside: avoid; page-break-inside: avoid; }
        .brand { padding-bottom: 10px; }
        .summary { padding: 12px 0 10px; }
        .details { padding-top: 8px; }
        .row { padding: 7px 0; }
        .footer { padding-top: 12px; }
      }
    </style>
  </head>
  <body>
    <main class="receipt">
      <header class="brand">
        <h1>UMOBIPAY</h1>
        <p>Pay Smart. Pay Fast.</p>
        <div class="copy">AEPS transaction receipt · Customer copy</div>
      </header>
      <section class="summary">
        <div class="amount-label">Transaction amount</div>
        <div class="amount">${amount}</div>
        <div class="status">${status}</div>
      </section>
      <section class="details">${rows}</section>
      <footer class="footer">
        <strong>Thank you for using UMOBIPAY</strong>
        <p>Please retain this receipt and the transaction reference for support or reconciliation.</p>
        <p class="generated">System-generated receipt · No signature required</p>
      </footer>
    </main>
    <script>window.addEventListener("load", () => { window.print(); window.onafterprint = () => window.close(); });</script>
  </body>
</html>`);
  printWindow.document.close();
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
            <h2 className="mt-1 text-xl font-black text-secondary">
              {compactTransactionReference(referenceId)}
            </h2>
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
                      {key === "referenceId"
                        ? compactTransactionReference(String(detail[key]))
                        : displayValue(key, detail[key])}
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
              onClick={() => {
                try {
                  printTransactionReceipt(receipt);
                } catch (reason) {
                  setError(operationsMessage(reason));
                }
              }}
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
                      {key === "transactionReferenceId"
                        ? compactTransactionReference(String(receipt[key]))
                        : displayValue(key, receipt[key])}
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
