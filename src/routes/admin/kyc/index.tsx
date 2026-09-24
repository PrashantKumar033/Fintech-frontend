import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Check, Eye, Loader2, RefreshCw, X } from "lucide-react";
import { ActionPermissionNotice } from "@/components/action-permission-notice";
import { AdminLayout, AdminPanel } from "@/components/admin/admin-layout";
import { useEffectiveAccess } from "@/hooks/use-effective-access";
import {
  adminApi,
  getAdminActor,
  type KycReviewDetail,
  type KycReviewListItem,
  type KycReviewStatus,
} from "@/lib/admin-api";
import { UI_PERMISSION } from "@/lib/ui-permissions";

export const Route = createFileRoute("/admin/kyc/")({ component: Kyc });
const statuses: Array<"" | KycReviewStatus> = [
  "",
  "PENDING",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
];
const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : "The KYC request could not be completed.";
const when = (value?: string | null) => (value ? new Date(value).toLocaleString("en-IN") : "—");

function Kyc() {
  const actor = getAdminActor();
  const { can } = useEffectiveAccess();
  const dedicatedSuperAdmin = actor?.kind === "SUPER_ADMIN";
  const allowed = (permission: string) =>
    dedicatedSuperAdmin || can(permission, ["SUPER_ADMIN", "ADMIN"]);
  const canView = allowed(UI_PERMISSION.KYC_REVIEW_LIST);
  const canInspect = allowed(UI_PERMISSION.KYC_REVIEW_VIEW);
  const canReviewDocument = allowed(UI_PERMISSION.KYC_REVIEW_DOCUMENT);
  const canReviewVideo = allowed(UI_PERMISSION.KYC_REVIEW_VIDEO);
  const canApprove = allowed(UI_PERMISSION.KYC_REVIEW_APPROVE);
  const canReject = allowed(UI_PERMISSION.KYC_REVIEW_REJECT);
  const canManage = canReviewDocument || canReviewVideo || canApprove || canReject;
  const [items, setItems] = useState<KycReviewListItem[]>([]);
  const [status, setStatus] = useState<"" | KycReviewStatus>("UNDER_REVIEW");
  const [page, setPage] = useState(1),
    [pages, setPages] = useState(1),
    [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [detail, setDetail] = useState<KycReviewDetail | null>(null);
  const [remarks, setRemarks] = useState("");
  const [decisionError, setDecisionError] = useState("");

  const load = useCallback(
    async (targetPage = 1) => {
      if (!canView) return;
      setLoading(true);
      setError("");
      try {
        const query = new URLSearchParams({ page: String(targetPage), limit: "20" });
        if (status) query.set("status", status);
        const response = await adminApi.kycReview.list(query.toString());
        setItems(response.data || []);
        setPage(response.pagination?.page || targetPage);
        setPages(Math.max(response.pagination?.totalPages || 1, 1));
        setTotal(response.pagination?.total || 0);
      } catch (caught) {
        setError(messageOf(caught));
      } finally {
        setLoading(false);
      }
    },
    [canView, status],
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  async function inspect(item: KycReviewListItem) {
    if (!canInspect) return setError(`Permission ${UI_PERMISSION.KYC_REVIEW_VIEW} is required.`);
    setBusy(true);
    setError("");
    try {
      const application = await adminApi.kycReview.get(item.identityId, item.accountType);
      setDetail(application);
      setRemarks(application.remarks || "");
      setDecisionError("");
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setBusy(false);
    }
  }

  async function mutate(
    permitted: boolean,
    permission: string,
    task: () => Promise<unknown>,
    success: string,
  ) {
    if (!permitted) return setError(`Permission ${permission} is required.`);
    setBusy(true);
    setError("");
    setDecisionError("");
    setNotice("");
    try {
      await task();
      setNotice(success);
      if (detail) setDetail(await adminApi.kycReview.get(detail.identityId, detail.accountType));
      await load(page);
    } catch (caught) {
      const message = messageOf(caught);
      setError(message);
      setDecisionError(message);
    } finally {
      setBusy(false);
    }
  }

  function rejectionReason(label: string) {
    const reason = window.prompt(`Enter rejection reason for ${label}:`)?.trim();
    if (!reason) setError("A rejection reason is required.");
    return reason || null;
  }

  const pendingEvidence = detail
    ? [
        ...detail.documents
          .filter((document) => document.status !== "APPROVED")
          .map((document) => document.documentType.replaceAll("_", " ")),
        ...(detail.video?.status === "APPROVED" ? [] : ["VERIFICATION VIDEO"]),
      ]
    : [];
  const approvedEvidenceCount = detail
    ? detail.documents.filter((document) => document.status === "APPROVED").length +
      (detail.video?.status === "APPROVED" ? 1 : 0)
    : 0;
  const evidenceCount = detail ? detail.documents.length + 1 : 0;
  const allEvidenceApproved = !!detail?.video && pendingEvidence.length === 0;

  return (
    <AdminLayout
      active="kyc"
      eyebrow="Compliance"
      title="KYC approvals"
      description="Review documents and video evidence, then record the final KYC decision."
    >
      {!canView && (
        <ActionPermissionNotice
          permission={UI_PERMISSION.KYC_REVIEW_LIST}
          title="KYC review queue is not enabled"
        />
      )}
      {canView && !canManage && (
        <div className="mb-5">
          <ActionPermissionNotice
            permission={UI_PERMISSION.KYC_REVIEW_APPROVE}
            title="KYC queue is read-only"
          />
        </div>
      )}
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700"
        >
          {error}
        </p>
      )}
      {notice && (
        <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
          {notice}
        </p>
      )}
      {canView && (
        <AdminPanel>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">Compliance review queue</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {total} applications match the current filter.
              </p>
            </div>
            <div className="flex gap-2">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
                className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm"
              >
                {statuses.map((value) => (
                  <option key={value || "ALL"} value={value}>
                    {value || "ALL STATUSES"}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void load(page)}
                disabled={loading}
                className="rounded-xl border border-border p-3 disabled:opacity-50"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                  <th className="p-3">Account</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Evidence</th>
                  <th className="p-3">Submitted</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-border/70">
                    <td className="p-3">
                      <p className="font-bold">{item.identityId}</p>
                      <p className="text-xs text-muted-foreground">{item.accountType}</p>
                    </td>
                    <td className="p-3">
                      <Status value={item.status} />
                    </td>
                    <td className="p-3">
                      {item._count?.documents || 0} documents ·{" "}
                      {item.video ? `video ${item.video.status}` : "no video"}
                    </td>
                    <td className="p-3">{when(item.submittedAt || item.createdAt)}</td>
                    <td className="p-3 text-right">
                      {canInspect && (
                        <button
                          type="button"
                          onClick={() => void inspect(item)}
                          disabled={busy}
                          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 font-bold disabled:opacity-50"
                        >
                          <Eye size={15} /> Review
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!loading && !items.length && (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-muted-foreground">
                      No KYC applications found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <button
              disabled={page <= 1 || loading}
              onClick={() => void load(page - 1)}
              className="rounded-lg border border-border px-3 py-2 text-xs font-bold disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs font-bold">
              Page {page} of {pages}
            </span>
            <button
              disabled={page >= pages || loading}
              onClick={() => void load(page + 1)}
              className="rounded-lg border border-border px-3 py-2 text-xs font-bold disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </AdminPanel>
      )}
      {detail && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase text-primary">{detail.accountType}</p>
                <h2 className="mt-1 text-xl font-black">KYC {detail.identityId}</h2>
                <Status value={detail.status} />
              </div>
              <button
                aria-label="Close review"
                onClick={() => {
                  setDetail(null);
                  setRemarks("");
                  setDecisionError("");
                }}
                className="rounded-xl border border-border p-2"
              >
                <X />
              </button>
            </div>
            <section className="mt-5 rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-black text-secondary">Final review decision</h3>
                  <p className="text-xs text-muted-foreground">
                    Remarks are optional for approval and required for rejection.
                  </p>
                </div>
                {detail.status !== "UNDER_REVIEW" && (
                  <span className="mt-2 w-fit rounded-full bg-amber-50 px-3 py-1 text-[10px] font-black text-amber-700 sm:mt-0">
                    {detail.status === "PENDING" ? "WAITING FOR SUBMISSION" : "DECISION RECORDED"}
                  </span>
                )}
              </div>
              {detail.status === "PENDING" && (
                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                  The applicant must upload all required evidence and submit the KYC application.
                  The backend will then move it to UNDER REVIEW and enable review actions.
                </p>
              )}
              {detail.status === "UNDER_REVIEW" && (
                <div
                  className={`mt-3 rounded-lg border p-3 text-xs font-semibold ${
                    allEvidenceApproved
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-amber-200 bg-amber-50 text-amber-800"
                  }`}
                >
                  <p className="font-extrabold">
                    Evidence approved: {approvedEvidenceCount} of {evidenceCount}
                  </p>
                  <p className="mt-1">
                    {allEvidenceApproved
                      ? "All documents and the verification video are approved. Final approval is now available."
                      : `Approve the remaining evidence first: ${pendingEvidence.join(", ")}.`}
                  </p>
                </div>
              )}
              <label className="mt-4 block text-xs font-extrabold uppercase tracking-wide text-secondary">
                Reviewer remarks (required for rejection)
                <textarea
                  value={remarks}
                  onChange={(event) => {
                    setRemarks(event.target.value);
                    setDecisionError("");
                  }}
                  disabled={(!canApprove && !canReject) || detail.status !== "UNDER_REVIEW"}
                  maxLength={1000}
                  placeholder="Add approval notes or enter the required rejection reason"
                  className="mt-2 min-h-24 w-full resize-y rounded-xl border border-border bg-white p-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-primary disabled:cursor-not-allowed disabled:bg-muted/50"
                />
              </label>
              {decisionError && (
                <p role="alert" className="mt-2 text-xs font-bold text-red-700">
                  {decisionError}
                </p>
              )}
              <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={!canReject || busy || detail.status !== "UNDER_REVIEW"}
                  title={
                    detail.status === "UNDER_REVIEW"
                      ? "Reject this KYC application"
                      : "Available after the applicant submits the KYC application"
                  }
                  onClick={() => {
                    const reason = remarks.trim();
                    if (!reason) {
                      setDecisionError("A rejection reason is required.");
                      return;
                    }
                    void mutate(
                      canReject,
                      UI_PERMISSION.KYC_REVIEW_REJECT,
                      () =>
                        adminApi.kycReview.reject(detail.identityId, detail.accountType, reason),
                      "KYC rejected.",
                    );
                  }}
                  className="cursor-pointer rounded-xl border border-red-200 px-5 py-3 text-sm font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Reject KYC
                </button>
                <button
                  type="button"
                  disabled={
                    !canApprove || busy || detail.status !== "UNDER_REVIEW" || !allEvidenceApproved
                  }
                  title={
                    detail.status !== "UNDER_REVIEW"
                      ? "Available after the applicant submits the KYC application"
                      : !allEvidenceApproved
                        ? `Approve pending evidence first: ${pendingEvidence.join(", ")}`
                        : "Approve this KYC application"
                  }
                  onClick={() => {
                    const reason = remarks.trim();
                    void mutate(
                      canApprove,
                      UI_PERMISSION.KYC_REVIEW_APPROVE,
                      () =>
                        adminApi.kycReview.approve(
                          detail.identityId,
                          detail.accountType,
                          reason || undefined,
                        ),
                      "KYC approved.",
                    );
                  }}
                  className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? <Loader2 className="animate-spin" size={17} /> : "Approve KYC"}
                </button>
              </div>
            </section>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {detail.documents.map((document) => (
                <article key={document.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-black">{document.documentType.replaceAll("_", " ")}</h3>
                      <p className="text-xs text-muted-foreground">
                        {document.status}
                        {document.verificationStatus ? ` · ${document.verificationStatus}` : ""}
                      </p>
                    </div>
                    {document.previewUrl && (
                      <a
                        href={document.previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-primary"
                      >
                        Preview
                      </a>
                    )}
                  </div>
                  {canReviewDocument && detail.status === "UNDER_REVIEW" && (
                    <div className="mt-4 flex gap-2">
                      <button
                        disabled={busy || document.status === "APPROVED"}
                        onClick={() =>
                          void mutate(
                            canReviewDocument,
                            UI_PERMISSION.KYC_REVIEW_DOCUMENT,
                            () =>
                              adminApi.kycReview.document(
                                detail.identityId,
                                detail.accountType,
                                document.id,
                                "APPROVED",
                              ),
                            `${document.documentType} approved.`,
                          )
                        }
                        className="flex-1 cursor-pointer rounded-lg bg-emerald-50 py-2 text-xs font-bold text-emerald-700 disabled:cursor-default disabled:opacity-60"
                      >
                        <Check className="mr-1 inline" size={14} />
                        {document.status === "APPROVED" ? "Approved" : "Approve"}
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => {
                          const reason = rejectionReason(document.documentType);
                          if (reason)
                            void mutate(
                              canReviewDocument,
                              UI_PERMISSION.KYC_REVIEW_DOCUMENT,
                              () =>
                                adminApi.kycReview.document(
                                  detail.identityId,
                                  detail.accountType,
                                  document.id,
                                  "REJECTED",
                                  reason,
                                ),
                              `${document.documentType} rejected.`,
                            );
                        }}
                        className="flex-1 rounded-lg bg-red-50 py-2 text-xs font-bold text-red-700"
                      >
                        <X className="mr-1 inline" size={14} />
                        Reject
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
            {detail.video && (
              <article className="mt-3 rounded-xl border border-border p-4">
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-black">Verification video</h3>
                    <p className="text-xs text-muted-foreground">{detail.video.status}</p>
                  </div>
                  {detail.video.previewUrl && (
                    <a
                      href={detail.video.previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-primary"
                    >
                      Preview video
                    </a>
                  )}
                </div>
                {canReviewVideo && detail.status === "UNDER_REVIEW" && (
                  <div className="mt-4 flex gap-2">
                    <button
                      disabled={busy || detail.video.status === "APPROVED"}
                      onClick={() =>
                        void mutate(
                          canReviewVideo,
                          UI_PERMISSION.KYC_REVIEW_VIDEO,
                          () =>
                            adminApi.kycReview.video(
                              detail.identityId,
                              detail.accountType,
                              "APPROVED",
                            ),
                          "Video approved.",
                        )
                      }
                      className="cursor-pointer rounded-lg bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 disabled:cursor-default disabled:opacity-60"
                    >
                      {detail.video.status === "APPROVED" ? "Video approved" : "Approve video"}
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => {
                        const reason = rejectionReason("verification video");
                        if (reason)
                          void mutate(
                            canReviewVideo,
                            UI_PERMISSION.KYC_REVIEW_VIDEO,
                            () =>
                              adminApi.kycReview.video(
                                detail.identityId,
                                detail.accountType,
                                "REJECTED",
                                reason,
                              ),
                            "Video rejected.",
                          );
                      }}
                      className="rounded-lg bg-red-50 px-4 py-2 text-xs font-bold text-red-700"
                    >
                      Reject video
                    </button>
                  </div>
                )}
              </article>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function Status({ value }: { value: string }) {
  const tone =
    value === "APPROVED"
      ? "bg-emerald-50 text-emerald-700"
      : value === "REJECTED"
        ? "bg-red-50 text-red-700"
        : "bg-amber-50 text-amber-700";
  return (
    <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ${tone}`}>
      {value.replaceAll("_", " ")}
    </span>
  );
}
