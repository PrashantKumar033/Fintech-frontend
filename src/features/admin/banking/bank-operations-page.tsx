import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Eye,
  FileText,
  Landmark,
  Loader2,
  RefreshCw,
  Search,
  X,
  XCircle,
} from "lucide-react";
import { AdminLayout, AdminPanel } from "@/components/admin/admin-layout";
import { BankVerificationReconciliation } from "@/components/admin/bank-verification-reconciliation";
import { useEffectiveAccess } from "@/hooks/use-effective-access";
import {
  adminApi,
  getAdminActor,
  type AdminBankAccount,
  type AdminBankAccountDetail,
} from "@/lib/admin-api";
import { UI_PERMISSION } from "@/lib/ui-permissions";

const control =
  "rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-primary";
const messageOf = (value: unknown) =>
  value instanceof Error ? value.message : "The bank account request could not be completed.";

export function AdminBankOperationsPage() {
  const actor = getAdminActor();
  const { can } = useEffectiveAccess();
  const privileged = actor?.kind === "SUPER_ADMIN";
  const canList = privileged || can(UI_PERMISSION.BANK_ACCOUNT_LIST, ["SUPER_ADMIN", "ADMIN"]);
  const canView = privileged || can(UI_PERMISSION.BANK_ACCOUNT_VIEW, ["SUPER_ADMIN", "ADMIN"]);
  const canReview = privileged || can(UI_PERMISSION.BANK_ACCOUNT_REVIEW, ["SUPER_ADMIN", "ADMIN"]);
  const [items, setItems] = useState<AdminBankAccount[]>([]);
  const [filters, setFilters] = useState({
    search: "",
    role: "",
    status: "",
    verificationStatus: "",
    ownershipStatus: "",
  });
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<AdminBankAccountDetail | null>(null);
  const [reviewReason, setReviewReason] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);
  const [passbookBusy, setPassbookBusy] = useState(false);
  const [workspace, setWorkspace] = useState<"accounts" | "reconciliation">("accounts");

  const load = useCallback(
    async (targetPage = 1) => {
      if (!canList) return;
      setLoading(true);
      setError("");
      try {
        const query = new URLSearchParams({ page: String(targetPage), limit: "20" });
        Object.entries(filters).forEach(
          ([key, value]) => value.trim() && query.set(key, value.trim()),
        );
        const response = await adminApi.operations.bankAccounts(query.toString());
        setItems(response.data || []);
        setPage(response.pagination.page || targetPage);
        setPages(Math.max(response.pagination.totalPages || 1, 1));
        setTotal(response.pagination.total || 0);
      } catch (value) {
        setError(messageOf(value));
      } finally {
        setLoading(false);
      }
    },
    [canList, filters],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void load(1), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function inspect(bankId: string) {
    if (!canView) return setError(`Permission ${UI_PERMISSION.BANK_ACCOUNT_VIEW} is required.`);
    setDetailLoading(true);
    setError("");
    try {
      setDetail(await adminApi.operations.bankAccount(bankId));
    } catch (value) {
      setError(messageOf(value));
    } finally {
      setDetailLoading(false);
    }
  }

  async function review(action: "approve" | "reject") {
    if (!detail || !canReview) return;
    if (action === "reject" && !reviewReason.trim()) {
      setError("Enter a clear rejection reason before rejecting this bank account.");
      return;
    }
    setReviewBusy(true);
    setError("");
    try {
      if (action === "approve") await adminApi.operations.approveBankAccount(detail.id);
      else await adminApi.operations.rejectBankAccount(detail.id, reviewReason);
      setDetail(await adminApi.operations.bankAccount(detail.id));
      setReviewReason("");
      await load(page);
    } catch (value) {
      setError(messageOf(value));
    } finally {
      setReviewBusy(false);
    }
  }

  async function openPassbook() {
    if (!detail || passbookBusy) return;
    const previewWindow = window.open("", "_blank");
    if (previewWindow) {
      previewWindow.opener = null;
      previewWindow.document.title = "Opening passbook...";
      previewWindow.document.body.textContent = "Opening the secured passbook...";
    }
    setPassbookBusy(true);
    setError("");
    try {
      // Signed S3 URLs expire quickly. Always ask the authenticated backend for
      // a fresh URL at the moment the reviewer opens the document.
      const freshDetail = await adminApi.operations.bankAccount(detail.id);
      setDetail(freshDetail);
      if (!freshDetail.passbook?.url) {
        throw new Error("No passbook is available for this bank account.");
      }
      if (previewWindow) previewWindow.location.replace(freshDetail.passbook.url);
      else window.open(freshDetail.passbook.url, "_blank", "noopener,noreferrer");
    } catch (value) {
      previewWindow?.close();
      setError(messageOf(value));
    } finally {
      setPassbookBusy(false);
    }
  }

  return (
    <AdminLayout
      active="banking"
      eyebrow="Bank service"
      title="Bank operations"
      description="Search member bank accounts and inspect verification and status history without exposing full account numbers."
    >
      <div className="mb-5 flex w-fit max-w-full gap-1 overflow-x-auto rounded-2xl border border-border bg-white p-1">
        <button
          type="button"
          onClick={() => setWorkspace("accounts")}
          className={`cursor-pointer whitespace-nowrap rounded-xl px-5 py-3 text-sm font-black ${workspace === "accounts" ? "bg-secondary text-white" : "text-secondary"}`}
        >
          Bank accounts
        </button>
        {privileged ? (
          <button
            type="button"
            onClick={() => setWorkspace("reconciliation")}
            className={`cursor-pointer whitespace-nowrap rounded-xl px-5 py-3 text-sm font-black ${workspace === "reconciliation" ? "bg-secondary text-white" : "text-secondary"}`}
          >
            Verification reconciliation
          </button>
        ) : null}
      </div>
      {workspace === "reconciliation" && privileged ? (
        <BankVerificationReconciliation />
      ) : (
        <>
          {error && (
            <p
              role="alert"
              className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700"
            >
              {error}
            </p>
          )}
          <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Total accounts" value={total} />
            <Metric
              label="Active on page"
              value={items.filter((item) => item.status === "ACTIVE").length}
            />
            <Metric
              label="Verified on page"
              value={items.filter((item) => item.verificationStatus === "VERIFIED").length}
            />
            <Metric
              label="Pending on page"
              value={items.filter((item) => item.status === "PENDING").length}
            />
          </div>
          <AdminPanel>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <label className="relative md:col-span-2">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  size={16}
                />
                <input
                  value={filters.search}
                  onChange={(event) => setFilters((v) => ({ ...v, search: event.target.value }))}
                  placeholder="Bank, holder, IFSC or last 4"
                  className={`${control} w-full pl-9`}
                />
              </label>
              <Filter
                label="All roles"
                value={filters.role}
                values={["ADMIN", "MASTER_DISTRIBUTOR", "DISTRIBUTOR", "RETAILER"]}
                set={(role) => setFilters((v) => ({ ...v, role }))}
              />
              <Filter
                label="All statuses"
                value={filters.status}
                values={["PENDING", "ACTIVE", "INACTIVE", "BLOCKED"]}
                set={(status) => setFilters((v) => ({ ...v, status }))}
              />
              <Filter
                label="All verification"
                value={filters.verificationStatus}
                values={["PENDING", "PROCESSING", "VERIFIED", "REJECTED", "FAILED"]}
                set={(verificationStatus) => setFilters((v) => ({ ...v, verificationStatus }))}
              />
              <Filter
                label="All ownership"
                value={filters.ownershipStatus}
                values={["PENDING", "VERIFIED", "FAILED"]}
                set={(ownershipStatus) => setFilters((v) => ({ ...v, ownershipStatus }))}
              />
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => void load(page)}
                className={`${control} flex items-center gap-2 font-bold`}
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
            <div className="mt-4 overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                  <tr>
                    {[
                      "Bank account",
                      "Member ID",
                      "Type",
                      "Status",
                      "Admin review",
                      "Verification",
                      "Ownership",
                      "Action",
                    ].map((label) => (
                      <th key={label} className="px-4 py-3">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="h-44 text-center">
                        <Loader2 className="mx-auto animate-spin text-primary" />
                      </td>
                    </tr>
                  ) : items.length ? (
                    items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3">
                          <p className="font-extrabold">
                            {item.bankName} ····{item.accountNumberLast4}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.accountHolderName} · {item.ifsc}
                          </p>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{item.identityId}</td>
                        <td className="px-4 py-3">{item.accountType}</td>
                        <td className="px-4 py-3">
                          <Status value={item.status} />
                        </td>
                        <td className="px-4 py-3">
                          <Status value={item.adminReviewStatus || "PENDING"} />
                        </td>
                        <td className="px-4 py-3">
                          <Status value={item.verificationStatus} />
                        </td>
                        <td className="px-4 py-3">
                          <Status value={item.ownershipStatus} />
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            disabled={!canView || detailLoading}
                            onClick={() => void inspect(item.id)}
                            className="cursor-pointer rounded-lg border border-border p-2"
                            title="View bank details"
                          >
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="h-44 text-center text-muted-foreground">
                        No bank accounts match these filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs font-bold">
              <span>{total} bank accounts</span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1 || loading}
                  onClick={() => void load(page - 1)}
                  className={control}
                >
                  Previous
                </button>
                <span>
                  Page {page} of {pages}
                </span>
                <button
                  disabled={page >= pages || loading}
                  onClick={() => void load(page + 1)}
                  className={control}
                >
                  Next
                </button>
              </div>
            </div>
          </AdminPanel>
          {detailLoading && (
            <div className="fixed inset-0 z-[100] grid place-items-center bg-secondary/50">
              <Loader2 className="animate-spin text-white" />
            </div>
          )}
          {detail && (
            <div className="fixed inset-0 z-[100] grid place-items-center bg-secondary/60 p-4">
              <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
                <div className="flex justify-between">
                  <div>
                    <p className="text-xs font-black uppercase text-primary">Bank account detail</p>
                    <h2 className="flex items-center gap-2 text-xl font-black">
                      <Landmark size={20} />
                      {detail.bankName} ····{detail.accountNumberLast4}
                    </h2>
                  </div>
                  <button onClick={() => setDetail(null)}>
                    <X />
                  </button>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <DetailGroup title="Account information">
                    <DetailRow label="Account holder" value={detail.accountHolderName} />
                    <DetailRow label="Bank" value={detail.bankName} />
                    <DetailRow label="Account number" value={`••••${detail.accountNumberLast4}`} />
                    <DetailRow label="Account type" value={detail.accountType} />
                    <DetailRow label="IFSC" value={detail.ifsc} />
                    <DetailRow label="Branch" value={detail.branchName} />
                  </DetailGroup>
                  <DetailGroup title="Account status">
                    <DetailRow label="Status" value={<Status value={detail.status} />} />
                    <DetailRow
                      label="Verification"
                      value={<Status value={detail.verificationStatus} />}
                    />
                    <DetailRow
                      label="Ownership"
                      value={<Status value={detail.ownershipStatus} />}
                    />
                    <DetailRow
                      label="Admin review"
                      value={<Status value={detail.adminReviewStatus || "PENDING"} />}
                    />
                    <DetailRow label="Review reason" value={detail.adminReviewReason} />
                    <DetailRow label="Reviewed on" value={formatDate(detail.adminReviewedAt)} />
                    <DetailRow label="Default account" value={detail.isDefault ? "Yes" : "No"} />
                    <DetailRow label="Purposes" value={detail.purposes?.join(", ") || "—"} />
                    <DetailRow label="Verified on" value={formatDate(detail.verifiedAt)} />
                  </DetailGroup>
                </div>
                <section className="mt-4 rounded-xl border border-border p-4">
                  <h3 className="font-black">Passbook &amp; review</h3>
                  {detail.passbook?.url ? (
                    <button
                      type="button"
                      disabled={passbookBusy}
                      onClick={() => void openPassbook()}
                      className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-bold text-primary"
                    >
                      {passbookBusy ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                      {passbookBusy ? "Opening..." : `Open ${detail.passbook.originalName || "passbook"}`}
                    </button>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">No passbook is available.</p>
                  )}
                  {canReview && detail.adminReviewStatus === "PENDING" ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                      <input
                        value={reviewReason}
                        onChange={(event) => setReviewReason(event.target.value)}
                        placeholder="Reason required only when rejecting"
                        className={control}
                      />
                      <button
                        type="button"
                        disabled={reviewBusy}
                        onClick={() => void review("approve")}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                      >
                        <CheckCircle2 size={16} /> Approve
                      </button>
                      <button
                        type="button"
                        disabled={reviewBusy}
                        onClick={() => void review("reject")}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                      >
                        <XCircle size={16} /> Reject
                      </button>
                    </div>
                  ) : null}
                </section>
                <DetailHistory
                  title="Verification history"
                  items={detail.bankAccountVerifications}
                  empty="No verification attempts recorded."
                />
                <DetailHistory
                  title="Status history"
                  items={detail.userBankStatusAudits}
                  empty="No status changes recorded."
                />
              </div>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}

function Filter({
  label,
  value,
  values,
  set,
}: {
  label: string;
  value: string;
  values: string[];
  set: (value: string) => void;
}) {
  return (
    <select value={value} onChange={(event) => set(event.target.value)} className={control}>
      <option value="">{label}</option>
      {values.map((item) => (
        <option key={item}>{item}</option>
      ))}
    </select>
  );
}
function Status({ value }: { value: string }) {
  const good = ["ACTIVE", "VERIFIED", "APPROVED"].includes(value);
  return (
    <span
      className={`rounded-full px-2 py-1 text-[10px] font-black ${good ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
    >
      {value}
    </span>
  );
}
function Metric({ label, value }: { label: string; value: number }) {
  return (
    <AdminPanel>
      <p className="text-xs font-bold uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </AdminPanel>
  );
}

function DetailGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border p-4">
      <h3 className="mb-3 font-black">{title}</h3>
      <dl className="space-y-3">{children}</dl>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <dt className="text-xs font-bold text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-semibold">{value || "—"}</dd>
    </div>
  );
}

function DetailHistory({
  title,
  items,
  empty,
}: {
  title: string;
  items?: Array<Record<string, unknown>>;
  empty: string;
}) {
  return (
    <section className="mt-4 rounded-xl border border-border p-4">
      <h3 className="font-black">{title}</h3>
      {items?.length ? (
        <div className="mt-3 space-y-2">
          {items.map((item, index) => (
            <div key={String(item.id ?? index)} className="rounded-lg bg-muted p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong>{String(item.status ?? item.verificationStatus ?? "Recorded")}</strong>
                <span className="text-xs text-muted-foreground">
                  {formatDate(item.createdAt ?? item.verifiedAt ?? item.updatedAt)}
                </span>
              </div>
              {Boolean(item.reason || item.remarks || item.provider) && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {String(item.reason ?? item.remarks ?? item.provider)}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">{empty}</p>
      )}
    </section>
  );
}

function formatDate(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("en-IN");
}
