import { useCallback, useEffect, useState } from "react";
import {
  CircleAlert,
  Download,
  Eye,
  LoaderCircle,
  Printer,
  ReceiptText,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { ActionPermissionNotice } from "@/components/action-permission-notice";
import { useEffectiveAccess } from "@/hooks/use-effective-access";
import { getSession } from "@/lib/auth-api";
import {
  payoutApi,
  payoutMessage,
  type PayoutReceipt,
  type PayoutSettlement,
  type PayoutSettlementDetail,
  type PayoutSettlementStatus,
} from "@/lib/payout-api";
import { UI_PERMISSION } from "@/lib/ui-permissions";

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
});

const statuses: Array<PayoutSettlementStatus | ""> = [
  "",
  "CREATED",
  "WALLET_RESERVE_PENDING",
  "RESERVED",
  "SUBMITTING",
  "QUEUED",
  "PENDING",
  "SUCCESS",
  "FAILED",
  "UNKNOWN",
];

function formatTime(value?: string | null) {
  return value ? new Date(value).toLocaleString("en-IN") : "—";
}

function statusClass(status: PayoutSettlementStatus) {
  if (status === "SUCCESS") return "bg-emerald-50 text-emerald-700";
  if (status === "FAILED") return "bg-red-50 text-red-700";
  if (status === "UNKNOWN") return "bg-slate-100 text-slate-700";
  return "bg-amber-50 text-amber-800";
}

function shortReference(value: string) {
  return value.length > 18 ? `${value.slice(0, 10)}…${value.slice(-6)}` : value;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function payoutReceiptDocument(receipt: PayoutReceipt, autoPrint: boolean) {
  const receiptMoney = (value: string) => money.format(Number(value));
  const rows: Array<[string, string | null]> = [
    ["Payment mode", receipt.paymentMode],
    ["Source wallet", receipt.sourceWallet],
    ["Beneficiary", receipt.beneficiary.name],
    ["Account number", receipt.beneficiary.accountNumber],
    ["IFSC", receipt.beneficiary.ifsc],
    ["Merchant reference", receipt.references.merchant],
    ["Provider reference", receipt.references.provider],
    ["Bank reference (RRN)", receipt.references.rrn],
    ["Initiated at", formatTime(receipt.timestamps.initiatedAt)],
    [
      "Completed at",
      receipt.timestamps.completedAt ? formatTime(receipt.timestamps.completedAt) : null,
    ],
  ];
  const detailRows = rows
    .filter(([, value]) => value)
    .map(
      ([label, value]) => `
        <div class="row">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>`,
    )
    .join("");
  const successful = receipt.status === "SUCCESS";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>UMOBIPAY payout receipt - ${escapeHtml(receipt.receiptNumber)}</title>
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
      .status { display: inline-block; padding: 5px 12px; border-radius: 20px; background: ${successful ? "#e2f8ed" : "#fff4dc"}; color: ${successful ? "#087443" : "#8a5300"}; font-size: 10px; font-weight: 800; letter-spacing: .6px; }
      .charges { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding: 18px 0; border-bottom: 1px dashed #9dbdb7; }
      .charge { padding: 12px; border-radius: 10px; background: #f1f8f6; text-align: center; }
      .charge span { display: block; color: #607a76; font-size: 9px; font-weight: 700; text-transform: uppercase; }
      .charge strong { display: block; margin-top: 4px; font-size: 14px; }
      .details { display: grid; grid-template-columns: 1fr 1fr; column-gap: 36px; padding-top: 14px; }
      .row { display: flex; justify-content: space-between; gap: 18px; min-width: 0; padding: 11px 0; border-bottom: 1px dashed #d3e3df; }
      .row span { flex: 0 0 42%; color: #607a76; }
      .row strong { overflow-wrap: anywhere; text-align: right; }
      .footer { padding-top: 18px; text-align: center; }
      .footer strong { display: block; color: #00675d; }
      .footer p { margin: 5px 0 0; color: #718783; font-size: 10px; }
      @page { size: A4 portrait; margin: 14mm; }
      @media print {
        html, body { width: 182mm; min-height: 269mm; background: #fff; }
        .receipt { width: 182mm; min-height: 269mm; margin: 0; padding: 8mm 10mm; border: 1px solid #b8d8d1; box-shadow: none; break-inside: avoid; page-break-inside: avoid; }
      }
    </style>
  </head>
  <body>
    <main class="receipt">
      <header class="brand">
        <h1>UMOBIPAY</h1>
        <p>Pay Smart. Pay Fast.</p>
        <div class="copy">Payout transaction receipt · Customer copy</div>
      </header>
      <section class="summary">
        <div class="amount-label">Payout amount</div>
        <div class="amount">${escapeHtml(receiptMoney(receipt.transactionAmount))}</div>
        <div class="status">${escapeHtml(receipt.status.replaceAll("_", " "))}</div>
      </section>
      <section class="charges">
        <div class="charge"><span>Platform charges (GST incl.)</span><strong>${escapeHtml(receiptMoney(receipt.platformCharges.amount))}</strong></div>
        <div class="charge"><span>Taxable charge</span><strong>${escapeHtml(receiptMoney(receipt.platformCharges.taxableAmount))}</strong></div>
        <div class="charge"><span>GST @ ${escapeHtml(receipt.platformCharges.gst.rate)}%</span><strong>${escapeHtml(receiptMoney(receipt.platformCharges.gst.amount))}</strong></div>
        <div class="charge"><span>Total wallet debit</span><strong>${escapeHtml(receiptMoney(receipt.totalAmount))}</strong></div>
      </section>
      <section class="details">${detailRows}</section>
      <footer class="footer">
        <strong>Thank you for using UMOBIPAY</strong>
        <p>Please retain this receipt and reference number for support or reconciliation.</p>
        <p>System-generated receipt · No signature required</p>
      </footer>
    </main>
    ${autoPrint ? '<script>window.addEventListener("load", () => { window.print(); window.onafterprint = () => window.close(); });</script>' : ""}
  </body>
</html>`;
}

function printPayoutReceipt(receipt: PayoutReceipt) {
  const printWindow = window.open("", "_blank", "popup,width=1050,height=850");
  if (!printWindow) throw new Error("Allow pop-ups to print the payout receipt.");
  printWindow.document.write(payoutReceiptDocument(receipt, true));
  printWindow.document.close();
}

function downloadPayoutReceipt(receipt: PayoutReceipt) {
  const blob = new Blob([payoutReceiptDocument(receipt, false)], {
    type: "text/html;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `UMOBIPAY-payout-receipt-${receipt.receiptNumber.replace(/[^a-z0-9_-]+/gi, "-")}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function PayoutHistoryPanel() {
  const session = getSession();
  const accessToken = session?.accessToken;
  const { can } = useEffectiveAccess();
  const allowed = can(UI_PERMISSION.PAYOUT_SETTLEMENT_VIEW_SELF, [
    "MASTER_DISTRIBUTOR",
    "DISTRIBUTOR",
    "RETAILER",
  ]);
  const [items, setItems] = useState<PayoutSettlement[]>([]);
  const [status, setStatus] = useState<PayoutSettlementStatus | "">("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [receiptLoadingId, setReceiptLoadingId] = useState("");
  const [refreshingReference, setRefreshingReference] = useState("");
  const [detail, setDetail] = useState<PayoutSettlementDetail | null>(null);
  const [receipt, setReceipt] = useState<PayoutReceipt | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!accessToken || !allowed) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await payoutApi.history(accessToken, { page, limit: 10, status });
      setItems(result.items);
      setTotal(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
    } catch (requestError) {
      setItems([]);
      setTotal(0);
      setTotalPages(0);
      setError(payoutMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [accessToken, allowed, page, status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openDetail(id: string) {
    if (!accessToken || !allowed) return;
    setDetailLoading(true);
    setError("");
    try {
      setDetail(await payoutApi.detail(accessToken, id));
    } catch (requestError) {
      setError(payoutMessage(requestError));
    } finally {
      setDetailLoading(false);
    }
  }

  async function refreshStatus(item: PayoutSettlement) {
    if (!accessToken || !allowed) return;
    setRefreshingReference(item.merchantRefId);
    setError("");
    try {
      const current = await payoutApi.status(accessToken, item.merchantRefId);
      setItems((existing) => existing.map((entry) => (entry.id === current.id ? current : entry)));
      if (detail?.id === current.id) setDetail(current);
    } catch (requestError) {
      setError(payoutMessage(requestError));
    } finally {
      setRefreshingReference("");
    }
  }

  async function openReceipt(transactionId: string) {
    if (!accessToken || !allowed) return;
    setReceiptLoadingId(transactionId);
    setError("");
    try {
      setReceipt(await payoutApi.receipt(accessToken, transactionId));
    } catch (requestError) {
      setError(payoutMessage(requestError));
    } finally {
      setReceiptLoadingId("");
    }
  }

  if (!session) return null;

  if (!allowed) {
    return (
      <ActionPermissionNotice
        permission={UI_PERMISSION.PAYOUT_SETTLEMENT_VIEW_SELF}
        title="Payout history is not enabled"
      />
    );
  }

  return (
    <>
      {error ? (
        <div className="mb-5 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          <CircleAlert className="mt-0.5 shrink-0" size={18} />
          <span>{error}</span>
        </div>
      ) : null}

      <section className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-primary">
              Payout ledger
            </p>
            <h2 className="mt-1 text-xl font-black text-secondary">Your payout history</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Track AEPS or MAIN wallet settlements, view details and download official receipts.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="text-xs font-black uppercase text-secondary">
              Status
              <select
                value={status}
                onChange={(event) => {
                  setPage(1);
                  setStatus(event.target.value as PayoutSettlementStatus | "");
                }}
                className="mt-2 w-full min-w-52 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold normal-case outline-none focus:border-primary"
              >
                {statuses.map((value) => (
                  <option key={value || "ALL"} value={value}>
                    {value ? value.replaceAll("_", " ") : "All statuses"}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold disabled:opacity-50 sm:mb-0.5"
            >
              <RefreshCw className={loading ? "animate-spin" : ""} size={16} /> Refresh
            </button>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-border">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-muted text-[11px] uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Reference</th>
                <th className="p-3">Provider reference</th>
                <th className="p-3">Provider</th>
                <th className="p-3">Bank</th>
                <th className="p-3">Mode</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Total debit</th>
                <th className="p-3">Status</th>
                <th className="p-3">Created</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center">
                    <LoaderCircle className="mx-auto animate-spin text-primary" />
                  </td>
                </tr>
              ) : items.length ? (
                items.map((item) => (
                  <tr key={item.id} className="border-t border-border align-middle">
                    <td className="p-3 font-bold text-secondary" title={item.merchantRefId}>
                      {shortReference(item.merchantRefId)}
                    </td>
                    <td className="p-3 font-mono text-xs">{item.providerReference || "—"}</td>
                    <td className="p-3">{item.providerCode}</td>
                    <td className="p-3">•••• {item.bankAccount.last4}</td>
                    <td className="p-3">
                      <span className="font-bold">{item.paymentMode}</span>
                      <span className="mt-0.5 block text-[10px] text-muted-foreground">
                        {item.sourceWallet} wallet
                      </span>
                    </td>
                    <td className="p-3 font-bold">{money.format(Number(item.amount))}</td>
                    <td className="p-3 font-bold">{money.format(Number(item.totalWalletDebit))}</td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-black ${statusClass(item.status)}`}
                      >
                        {item.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="p-3 text-xs">{formatTime(item.createdAt)}</td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => void openReceipt(item.id)}
                          disabled={receiptLoadingId === item.id}
                          className="grid h-9 w-9 place-items-center rounded-xl border border-border text-secondary disabled:opacity-50"
                          aria-label={`View ${item.merchantRefId} receipt`}
                          title="View receipt"
                        >
                          {receiptLoadingId === item.id ? (
                            <LoaderCircle className="animate-spin" size={15} />
                          ) : (
                            <ReceiptText size={16} />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => void refreshStatus(item)}
                          disabled={refreshingReference === item.merchantRefId}
                          className="grid h-9 w-9 place-items-center rounded-xl border border-border text-secondary disabled:opacity-50"
                          aria-label={`Refresh ${item.merchantRefId} status`}
                          title="Refresh status"
                        >
                          <RefreshCw
                            className={
                              refreshingReference === item.merchantRefId ? "animate-spin" : ""
                            }
                            size={15}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => void openDetail(item.id)}
                          disabled={detailLoading}
                          className="grid h-9 w-9 place-items-center rounded-xl border border-border text-secondary disabled:opacity-50"
                          aria-label={`View ${item.merchantRefId}`}
                          title="View details"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-muted-foreground">
                    <Search className="mx-auto mb-3" size={24} /> No payout settlements found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-muted-foreground">{total} payout settlement(s)</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={loading || page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="rounded-xl border border-border px-4 py-2 font-bold disabled:opacity-40"
            >
              Previous
            </button>
            <span className="font-bold">
              Page {page} of {Math.max(totalPages, 1)}
            </span>
            <button
              type="button"
              disabled={loading || totalPages === 0 || page >= totalPages}
              onClick={() => setPage((value) => value + 1)}
              className="rounded-xl border border-border px-4 py-2 font-bold disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {detail ? (
        <div className="fixed inset-0 z-[125] grid place-items-center bg-secondary/65 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-primary">
                  Payout transaction
                </p>
                <h2 className="mt-1 break-all text-xl font-black text-secondary">
                  {detail.merchantRefId}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border"
                aria-label="Close payout detail"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["Status", detail.status.replaceAll("_", " ")],
                ["Wallet state", detail.walletState.replaceAll("_", " ")],
                ["Provider", detail.providerCode],
                ["Provider reference", detail.providerReference || "—"],
                ["RRN", detail.rrn || "—"],
                ["Payment mode", detail.paymentMode],
                ["Source wallet", detail.sourceWallet],
                ["Bank account", `•••• ${detail.bankAccount.last4}`],
                ["Payout amount", money.format(Number(detail.amount))],
                ["Surcharge", money.format(Number(detail.surcharge.amount))],
                ["Total wallet debit", money.format(Number(detail.totalWalletDebit))],
                ["Created", formatTime(detail.createdAt)],
                ["Updated", formatTime(detail.updatedAt)],
                ["Queued", formatTime(detail.timeline.queuedAt)],
                ["Callback received", formatTime(detail.timeline.callbackReceivedAt)],
                ["Completed", formatTime(detail.timeline.completedAt)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-muted p-4">
                  <p className="text-[10px] font-black uppercase text-muted-foreground">{label}</p>
                  <p className="mt-1 break-all text-sm font-extrabold text-secondary">{value}</p>
                </div>
              ))}
            </div>

            {detail.failure ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <p className="font-black">Failure {detail.failure.code || ""}</p>
                <p className="mt-1">{detail.failure.message || "No provider failure message."}</p>
              </div>
            ) : null}

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => void openReceipt(detail.id)}
                disabled={receiptLoadingId === detail.id}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-black text-secondary disabled:opacity-50"
              >
                {receiptLoadingId === detail.id ? (
                  <LoaderCircle className="animate-spin" size={17} />
                ) : (
                  <ReceiptText size={17} />
                )}
                View receipt
              </button>
              <button
                type="button"
                onClick={() => void refreshStatus(detail)}
                disabled={refreshingReference === detail.merchantRefId}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-black text-white disabled:opacity-50"
              >
                <RefreshCw
                  className={refreshingReference === detail.merchantRefId ? "animate-spin" : ""}
                  size={17}
                />
                Refresh live status
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {receipt ? (
        <PayoutReceiptDialog
          receipt={receipt}
          onClose={() => setReceipt(null)}
          onError={setError}
        />
      ) : null}
    </>
  );
}

function PayoutReceiptDialog({
  receipt,
  onClose,
  onError,
}: {
  receipt: PayoutReceipt;
  onClose: () => void;
  onError: (message: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-[140] grid place-items-center bg-secondary/65 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-primary">
              Payout receipt
            </p>
            <h2 className="mt-1 break-all text-xl font-black text-secondary">
              {receipt.receiptNumber}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border"
            aria-label="Close payout receipt"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => downloadPayoutReceipt(receipt)}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-xs font-extrabold"
          >
            <Download size={15} /> Download receipt
          </button>
          <button
            type="button"
            onClick={() => {
              try {
                printPayoutReceipt(receipt);
              } catch (reason) {
                onError(payoutMessage(reason));
              }
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-extrabold text-white"
          >
            <Printer size={15} /> Print / save PDF
          </button>
        </div>

        <div className="mt-5 rounded-2xl border-2 border-secondary p-5 sm:p-7">
          <div className="border-b border-border pb-4 text-center">
            <h3 className="text-2xl font-black text-secondary">UMOBIPAY</h3>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Payout transaction receipt
            </p>
          </div>
          <div className="py-5 text-center">
            <p className="text-xs font-black uppercase text-muted-foreground">Payout amount</p>
            <p className="mt-1 text-3xl font-black text-secondary">
              {money.format(Number(receipt.transactionAmount))}
            </p>
            <span
              className={`mt-2 inline-block rounded-full px-3 py-1 text-[10px] font-black ${statusClass(receipt.status)}`}
            >
              {receipt.status.replaceAll("_", " ")}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              [
                "Platform charges (GST included)",
                money.format(Number(receipt.platformCharges.amount)),
              ],
              [
                "Taxable platform charge",
                money.format(Number(receipt.platformCharges.taxableAmount)),
              ],
              [
                `GST @ ${receipt.platformCharges.gst.rate}%`,
                money.format(Number(receipt.platformCharges.gst.amount)),
              ],
              ["Total wallet debit", money.format(Number(receipt.totalAmount))],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-muted p-3 text-center">
                <p className="text-[10px] font-black uppercase text-muted-foreground">{label}</p>
                <p className="mt-1 font-black text-secondary">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-x-6 sm:grid-cols-2">
            {[
              ["Source wallet", receipt.sourceWallet],
              ["Payment mode", receipt.paymentMode],
              ["Beneficiary", receipt.beneficiary.name],
              ["Account number", receipt.beneficiary.accountNumber || "—"],
              ["IFSC", receipt.beneficiary.ifsc],
              ["Merchant reference", receipt.references.merchant],
              ["Provider reference", receipt.references.provider || "—"],
              ["Bank reference (RRN)", receipt.references.rrn || "—"],
              ["Initiated", formatTime(receipt.timestamps.initiatedAt)],
              ["Completed", formatTime(receipt.timestamps.completedAt)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex justify-between gap-4 border-b border-dashed border-border py-3 text-sm"
              >
                <span className="text-muted-foreground">{label}</span>
                <strong className="break-all text-right text-secondary">{value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
