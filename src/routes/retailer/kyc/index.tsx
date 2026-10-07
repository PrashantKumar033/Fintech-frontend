import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Camera,
  ExternalLink,
  Eye,
  FileCheck2,
  FileUp,
  Fingerprint,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { ServiceNotice } from "@/components/business-page";
import { RoleAwareAccountPage } from "@/components/role-aware-account-page";
import { ApiError, getSession } from "@/lib/auth-api";
import {
  credentialsPending,
  isManagementRole,
  managementBasePath,
  signedInHome,
} from "@/lib/role-hierarchy";
import {
  complianceApi,
  complianceMessage,
  type KycBundle,
  type KycProfile,
} from "@/lib/compliance-api";

export const Route = createFileRoute("/retailer/kyc/")({
  head: () => ({ meta: [{ title: "KYC Verification — UMOBIPAY" }] }),
  component: KycPage,
});
const docs = [
  { type: "PAN_CARD", label: "PAN card", number: true },
  { type: "SIGNATURE", label: "Signature", number: false },
  { type: "SHOP_FRONT", label: "Shop front", number: false },
  { type: "BUSINESS_PROOF", label: "Business proof", number: true },
] as const;

type KycPreview = {
  title: string;
  fileName: string;
  mimeType?: string | null;
  url: string;
  video?: boolean;
};

function KycPage() {
  // KYC is a mandatory identity-owned onboarding step, not an optional package
  // capability. Its backend endpoints require authentication, while the
  // separate review endpoints are protected by KYC.REVIEW.* permissions.
  const canManageKyc = true;
  const navigate = useNavigate(),
    [session, setSession] = useState<ReturnType<typeof getSession>>(null),
    [kyc, setKyc] = useState<KycProfile | null>(null),
    [bundle, setBundle] = useState<KycBundle | null>(null),
    [preview, setPreview] = useState<KycPreview | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(""),
    [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  async function load(token: string, background = false) {
    if (!background) setLoading(true);
    try {
      const profile = await complianceApi.getKyc(token);
      setKyc(profile);
      setBundle(await complianceApi.bundle(token));
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setKyc(null);
        setBundle(null);
      } else setMessage({ ok: false, text: `KYC service: ${complianceMessage(error)}` });
    } finally {
      if (!background) setLoading(false);
    }
  }
  useEffect(() => {
    const value = getSession();
    if (!value) {
      navigate({ to: "/login" });
      return;
    }
    if (credentialsPending(value.identity)) {
      window.location.replace(signedInHome(value));
      return;
    }
    setSession(value);
    void load(value.accessToken);
  }, [navigate]);
  const uploaded = useMemo(
    () => new Set(bundle?.documents.map((d) => d.documentType) || []),
    [bundle],
  );
  if (!session)
    return (
      <div className="grid min-h-screen place-items-center">
        <RefreshCw className="animate-spin text-primary" />
      </div>
    );
  const activeSession = session;
  async function run(name: string, task: () => Promise<unknown>, text: string) {
    setBusy(name);
    setMessage(null);
    try {
      await task();
      await load(activeSession.accessToken, true);
      setMessage({ ok: true, text });
    } catch (e) {
      setMessage({ ok: false, text: complianceMessage(e) });
    } finally {
      setBusy("");
    }
  }

  async function previewDocument(documentId: string) {
    const operation = `preview-document-${documentId}`;
    setBusy(operation);
    setMessage(null);
    try {
      // Signed KYC URLs expire. Refresh the bundle on every preview so a
      // document never opens with an old or unsigned storage URL.
      const freshBundle = await complianceApi.bundle(activeSession.accessToken);
      setBundle(freshBundle);
      const document = freshBundle.documents.find((item) => item.id === documentId);
      if (!document?.previewUrl) throw new Error("A secure preview is not available right now.");
      setPreview({
        title: document.documentType.replaceAll("_", " "),
        fileName: document.originalFileName,
        mimeType: document.mimeType,
        url: document.previewUrl,
      });
    } catch (error) {
      setMessage({ ok: false, text: complianceMessage(error) });
    } finally {
      setBusy("");
    }
  }

  async function previewVideo() {
    const operation = "preview-video";
    setBusy(operation);
    setMessage(null);
    try {
      const freshBundle = await complianceApi.bundle(activeSession.accessToken);
      setBundle(freshBundle);
      if (!freshBundle.video?.previewUrl)
        throw new Error("A secure video preview is not available right now.");
      setPreview({
        title: "Verification video",
        fileName: freshBundle.video.originalFileName || "verification-video",
        mimeType: freshBundle.video.mimeType,
        url: freshBundle.video.previewUrl,
        video: true,
      });
    } catch (error) {
      setMessage({ ok: false, text: complianceMessage(error) });
    } finally {
      setBusy("");
    }
  }
  const editable = !!kyc && (kyc.status === "PENDING" || kyc.status === "REJECTED"),
    complete =
      docs.every((d) => uploaded.has(d.type)) &&
      uploaded.has("AADHAAR_FRONT") &&
      uploaded.has("AADHAAR_BACK") &&
      !!bundle?.video;
  const missingItems = [
    ...docs.filter((document) => !uploaded.has(document.type)).map((document) => document.label),
    ...(!uploaded.has("AADHAAR_FRONT") || !uploaded.has("AADHAAR_BACK")
      ? ["Aadhaar front & back"]
      : []),
    ...(!bundle?.video ? ["Verification video"] : []),
  ];
  return (
    <RoleAwareAccountPage
      identity={session.identity}
      section="kyc"
      eyebrow="Identity & compliance"
      title="KYC verification"
      description="Submit business documents and track approval status. KYC is the first prerequisite for AEPS."
    >
      {message && (
        <div className="mb-6">
          <ServiceNotice ok={message.ok}>{message.text}</ServiceNotice>
        </div>
      )}
      {loading ? (
        <div className="grid h-72 place-items-center rounded-2xl bg-card">
          <RefreshCw className="animate-spin text-primary" />
        </div>
      ) : !kyc ? (
        <section className="rounded-2xl border border-border bg-card p-8 shadow-soft">
          <div className="mx-auto max-w-xl text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-mint text-secondary">
              <BadgeCheck size={30} />
            </span>
            <h2 className="mt-5 text-2xl font-extrabold text-secondary">
              Start business verification
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Create your KYC application, then upload the required documents securely.
            </p>
            <button
              disabled={!canManageKyc || !!busy}
              onClick={() =>
                run(
                  "create",
                  () => complianceApi.createKyc(session.accessToken),
                  "KYC application created.",
                )
              }
              className="mt-6 rounded-xl bg-secondary px-6 py-3 text-sm font-bold text-white"
            >
              Create KYC application
            </button>
          </div>
        </section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <section className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-primary">
                    Application status
                  </p>
                  <h2 className="mt-1 text-xl font-extrabold text-secondary">
                    {kyc.status.replaceAll("_", " ")}
                  </h2>
                </div>
                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${kyc.status === "APPROVED" ? "bg-emerald-50 text-emerald-700" : kyc.status === "REJECTED" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}
                >
                  {kyc.status}
                </span>
              </div>
              {kyc.remarks && (
                <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                  Reviewer remarks: {kyc.remarks}
                </p>
              )}
            </div>
            {editable && (
              <>
                <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
                  <h2 className="font-extrabold text-secondary">1. Business documents</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    JPEG, PNG or PDF as supported by the KYC service.
                  </p>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {docs.map((d) => (
                      <DocumentCard
                        key={d.type}
                        label={d.label}
                        needNumber={d.number}
                        done={uploaded.has(d.type)}
                        existingNumber={
                          bundle?.documents.find((item) => item.documentType === d.type)
                            ?.documentNumber || ""
                        }
                        disabled={!canManageKyc || !!busy}
                        upload={(file, number) =>
                          run(
                            d.type,
                            () =>
                              complianceApi.uploadDocument(
                                session.accessToken,
                                d.type,
                                number,
                                file,
                              ),
                            `${d.label} uploaded.`,
                          )
                        }
                        replace={(file, number) =>
                          run(
                            `replace-${d.type}`,
                            () =>
                              complianceApi.updateDocument(
                                session.accessToken,
                                d.type,
                                number,
                                file,
                              ),
                            `${d.label} replaced and queued for verification.`,
                          )
                        }
                      />
                    ))}
                  </div>
                </section>
                <AadhaarCard
                  done={uploaded.has("AADHAAR_FRONT") && uploaded.has("AADHAAR_BACK")}
                  disabled={!canManageKyc || !!busy}
                  upload={(number, front, back) =>
                    run(
                      "aadhaar",
                      () =>
                        uploaded.has("AADHAAR_FRONT") || uploaded.has("AADHAAR_BACK")
                          ? complianceApi.updateAadhaar(session.accessToken, number, front, back)
                          : complianceApi.uploadAadhaar(session.accessToken, number, front, back),
                      uploaded.has("AADHAAR_FRONT") || uploaded.has("AADHAAR_BACK")
                        ? "Aadhaar images replaced and queued for verification."
                        : "Aadhaar uploaded.",
                    )
                  }
                />
                <VideoCard
                  done={!!bundle?.video}
                  disabled={!canManageKyc || !!busy}
                  upload={(file) =>
                    run(
                      "video",
                      () => complianceApi.uploadVideo(session.accessToken, file),
                      "Verification video uploaded.",
                    )
                  }
                />
                {!complete && (
                  <div
                    role="alert"
                    className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
                  >
                    <p className="font-bold">Complete these items before final submission:</p>
                    <p className="mt-1">{missingItems.join(", ")}</p>
                  </div>
                )}
                {complete && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                    <p className="font-extrabold">All required uploads are complete.</p>
                    <p className="mt-1">
                      Your KYC is still a draft. Use the button below to submit it to the admin
                      review queue.
                    </p>
                  </div>
                )}
                <button
                  type="button"
                  disabled={!canManageKyc || !complete || !!busy}
                  onClick={() =>
                    run(
                      "submit",
                      () => complianceApi.submitKyc(session.accessToken),
                      "KYC submitted for review.",
                    )
                  }
                  className="w-full rounded-xl bg-primary py-4 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy === "submit"
                    ? "Submitting KYC..."
                    : "Submit KYC now — send to admin review"}
                </button>
              </>
            )}
            {kyc.status === "UNDER_REVIEW" && (
              <ServiceNotice ok>
                Application submitted. The compliance team is reviewing your documents.
              </ServiceNotice>
            )}
            {kyc.status === "APPROVED" && (
              <section className="rounded-2xl bg-secondary p-7 text-white">
                <Fingerprint size={28} />
                <h2 className="mt-4 text-xl font-extrabold">KYC approved</h2>
                <p className="mt-2 text-sm text-white/65">
                  Your identity prerequisite is ready. Continue to the independent AEPS onboarding
                  service.
                </p>
                {isManagementRole(session.identity.role) ? (
                  <Link
                    to={managementBasePath(session.identity.role) as never}
                    className="mt-5 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-bold"
                  >
                    Return to dashboard
                  </Link>
                ) : (
                  <Link
                    to="/retailer/aeps"
                    search={{ service: undefined }}
                    className="mt-5 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-bold"
                  >
                    Continue to AEPS
                  </Link>
                )}
              </section>
            )}
            {(bundle?.documents.length || bundle?.video) && (
                <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
                  <h3 className="font-extrabold text-secondary">Uploaded files</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Secure previews are available while your application is being reviewed.
                  </p>
                  <div className="mt-4 space-y-2">
                    {bundle.documents.map((document) => (
                      <div
                        key={document.id}
                        className="flex items-center gap-2 rounded-xl bg-muted p-3 text-xs"
                      >
                        <FileCheck2 size={15} className="text-emerald-600" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">
                            {document.documentType.replaceAll("_", " ")}
                          </span>
                          <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                            {document.originalFileName}
                          </span>
                        </span>
                        <button
                          type="button"
                          disabled={!!busy}
                          aria-label={`Preview ${document.documentType}`}
                          title={`Preview ${document.documentType.replaceAll("_", " ")}`}
                          onClick={() => void previewDocument(document.id)}
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border bg-card text-secondary transition hover:border-primary hover:text-primary disabled:opacity-40"
                        >
                          {busy === `preview-document-${document.id}` ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            <Eye size={15} />
                          )}
                        </button>
                        {editable && (
                          <button
                            disabled={!canManageKyc || !!busy}
                            aria-label={`Delete ${document.documentType}`}
                            title={`Delete ${document.documentType.replaceAll("_", " ")}`}
                            onClick={() =>
                              run(
                                `delete-${document.id}`,
                                () =>
                                  complianceApi.deleteDocument(session.accessToken, document.id),
                                "Document removed. You can upload a replacement.",
                              )
                            }
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-red-600 transition hover:bg-red-50 disabled:opacity-40"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    ))}
                    {bundle.video && (
                      <div className="flex items-center gap-2 rounded-xl bg-muted p-3 text-xs">
                        <Camera size={15} className="text-emerald-600" />
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold">Verification video</span>
                          <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                            {bundle.video.originalFileName || "Uploaded verification video"}
                          </span>
                        </span>
                        <button
                          type="button"
                          disabled={!!busy}
                          aria-label="Preview verification video"
                          title="Preview verification video"
                          onClick={() => void previewVideo()}
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border bg-card text-secondary transition hover:border-primary hover:text-primary disabled:opacity-40"
                        >
                          {busy === "preview-video" ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            <Eye size={15} />
                          )}
                        </button>
                        {editable && (
                          <button
                            disabled={!canManageKyc || !!busy}
                            aria-label="Delete verification video"
                            title="Delete verification video"
                            onClick={() =>
                              run(
                                "delete-video",
                                () =>
                                  complianceApi.deleteVideo(session.accessToken, bundle.video!.id),
                                "Verification video removed.",
                              )
                            }
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-red-600 transition hover:bg-red-50 disabled:opacity-40"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
          </section>
          <aside>
            <div className="sticky top-6 space-y-4">

              <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
                <h3 className="font-extrabold text-secondary">Application checklist</h3>
                <div className="mt-5 space-y-3">
                  {[
                    ...docs.map((d) => [d.label, uploaded.has(d.type)] as const),
                    [
                      "Aadhaar front & back",
                      uploaded.has("AADHAAR_FRONT") && uploaded.has("AADHAAR_BACK"),
                    ] as const,
                    ["Verification video", !!bundle?.video] as const,
                  ].map(([label, done]) => (
                    <div key={label} className="flex items-center gap-3 text-sm">
                      <span
                        className={`grid h-7 w-7 place-items-center rounded-full ${done ? "bg-emerald-50 text-emerald-600" : "bg-muted text-muted-foreground"}`}
                      >
                        {done ? <FileCheck2 size={14} /> : <FileUp size={14} />}
                      </span>
                      <span
                        className={done ? "font-semibold text-secondary" : "text-muted-foreground"}
                      >
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
      {preview && <KycPreviewDialog preview={preview} onClose={() => setPreview(null)} />}
    </RoleAwareAccountPage>
  );
}

function KycPreviewDialog({ preview, onClose }: { preview: KycPreview; onClose: () => void }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  const extension = preview.fileName.split(".").pop()?.toLowerCase();
  const isImage =
    preview.mimeType?.startsWith("image/") ||
    ["jpg", "jpeg", "png", "webp"].includes(extension || "");

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center p-3 sm:p-6">
      <button
        type="button"
        aria-label="Close document preview"
        onClick={onClose}
        className="absolute inset-0 bg-secondary/70 backdrop-blur-sm"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="kyc-preview-title"
        className="relative flex h-[min(90vh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
      >
        <header className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1">
            <h2 id="kyc-preview-title" className="truncate font-extrabold text-secondary">
              {preview.title.replaceAll("_", " ")}
            </h2>
            <p className="truncate text-xs text-muted-foreground">{preview.fileName}</p>
          </div>
          <a
            href={preview.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-xs font-bold text-secondary transition hover:border-primary hover:text-primary"
          >
            <ExternalLink size={14} />
            <span className="hidden sm:inline">Open separately</span>
          </a>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg border border-border text-secondary hover:bg-muted"
            aria-label="Close preview"
          >
            <X size={17} />
          </button>
        </header>
        <div className="min-h-0 flex-1 bg-[#eef3f2] p-3 sm:p-5">
          {preview.video ? (
            <video
              src={preview.url}
              controls
              autoPlay={false}
              className="h-full w-full rounded-xl bg-black object-contain"
            >
              Your browser does not support video preview.
            </video>
          ) : isImage ? (
            <img
              src={preview.url}
              alt={`${preview.title} preview`}
              className="h-full w-full rounded-xl bg-white object-contain"
            />
          ) : (
            <iframe
              src={preview.url}
              title={`${preview.title} preview`}
              className="h-full w-full rounded-xl border-0 bg-white"
            />
          )}
        </div>
      </section>
    </div>
  );
}
function DocumentCard({
  label,
  needNumber,
  done,
  existingNumber,
  disabled,
  upload,
  replace,
}: {
  label: string;
  needNumber: boolean;
  done: boolean;
  existingNumber: string;
  disabled: boolean;
  upload: (file: File, number: string) => void;
  replace: (file: File, number: string) => void;
}) {
  const [number, setNumber] = useState(existingNumber);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const submit = () => {
    setError("");
    const value = number.trim().toUpperCase();
    if (needNumber && !value) return setError(`${label} number is required.`);
    if (label === "PAN card" && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value))
      return setError("Enter a valid PAN, for example ABCDE1234F.");
    if (!file) return setError(`Select the ${label} file.`);
    if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type))
      return setError("Only PDF, JPG, JPEG and PNG files are allowed.");
    if (file.size > 10 * 1024 * 1024) return setError("Document must not exceed 10 MB.");
    if (done) replace(file, value);
    else upload(file, value);
  };
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-secondary">{label}</p>
        {done && <BadgeCheck size={17} className="text-emerald-600" />}
      </div>
      {needNumber && (
        <input
          value={number}
          onChange={(e) => {
            setNumber(e.target.value.toUpperCase());
            setError("");
          }}
          placeholder="Document number"
          className="mt-3 w-full rounded-lg border border-border bg-card px-3 py-2 text-xs"
        />
      )}
      <input
        disabled={disabled}
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        onChange={(e) => {
          setFile(e.target.files?.[0] || null);
          setError("");
        }}
        className="mt-3 block w-full text-xs"
      />
      {error && (
        <p role="alert" className="mt-2 text-xs font-semibold text-red-600">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={submit}
        className="mt-3 w-full rounded-lg bg-secondary px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
      >
        {disabled ? "Uploading…" : done ? `Replace ${label}` : `Upload ${label}`}
      </button>
    </div>
  );
}

function VideoCard({
  done,
  disabled,
  upload,
}: {
  done: boolean;
  disabled: boolean;
  upload: (file: File) => void;
}) {
  const [file, setFile] = useState<File | null>(null),
    [error, setError] = useState("");
  const submit = () => {
    setError("");
    if (!file) return setError("Select or record a verification video.");
    if (!["video/mp4", "video/webm", "video/quicktime"].includes(file.type))
      return setError("Only MP4, WebM and MOV videos are allowed.");
    if (file.size > 100 * 1024 * 1024) return setError("Video must not exceed 100 MB.");
    upload(file);
  };
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-mint">
          <Camera size={18} />
        </span>
        <div>
          <h2 className="font-extrabold text-secondary">
            3. Live verification video {done && <span className="text-emerald-600">✓</span>}
          </h2>
          <p className="text-xs text-muted-foreground">
            Record or select an MP4, WebM or MOV video up to 100 MB.
          </p>
        </div>
      </div>
      <input
        disabled={disabled || done}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,.mov"
        capture="user"
        onChange={(e) => {
          setFile(e.target.files?.[0] || null);
          setError("");
        }}
        className="mt-5 block w-full text-sm"
      />
      {error && (
        <p role="alert" className="mt-2 text-xs font-semibold text-red-600">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={submit}
        className="mt-4 rounded-xl bg-secondary px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
      >
        {done ? "Video uploaded" : disabled ? "Uploading…" : "Upload verification video"}
      </button>
    </section>
  );
}
function AadhaarCard({
  done,
  disabled,
  upload,
}: {
  done: boolean;
  disabled: boolean;
  upload: (number: string, front: File, back: File) => void;
}) {
  const [number, setNumber] = useState(""),
    [front, setFront] = useState<File | null>(null),
    [back, setBack] = useState<File | null>(null),
    [error, setError] = useState("");
  const submit = () => {
    setError("");
    if (number.length !== 12) return setError("Enter a valid 12-digit Aadhaar number.");
    if (!front || !back) return setError("Select both Aadhaar front and back images.");
    if (![front, back].every((file) => ["image/jpeg", "image/png"].includes(file.type)))
      return setError("Aadhaar files must be JPG, JPEG or PNG images.");
    if ([front, back].some((file) => file.size > 5 * 1024 * 1024))
      return setError("Each Aadhaar image must not exceed 5 MB.");
    upload(number, front, back);
  };
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <h2 className="font-extrabold text-secondary">
        2. Aadhaar verification {done && <span className="text-emerald-600">✓</span>}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Upload clear front and back images together.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <input
          value={number}
          onChange={(e) => {
            setNumber(e.target.value.replace(/\D/g, "").slice(0, 12));
            setError("");
          }}
          placeholder="12-digit Aadhaar"
          className="rounded-xl border border-border px-3 py-2 text-sm"
        />
        <label className="text-xs font-bold text-muted-foreground">
          FRONT IMAGE
          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={(e) => {
              setFront(e.target.files?.[0] || null);
              setError("");
            }}
            className="mt-2 block w-full font-normal"
          />
        </label>
        <label className="text-xs font-bold text-muted-foreground">
          BACK IMAGE
          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={(e) => {
              setBack(e.target.files?.[0] || null);
              setError("");
            }}
            className="mt-2 block w-full font-normal"
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-xs font-semibold text-red-600">
          {error}
        </p>
      )}
      <button
        disabled={disabled}
        onClick={submit}
        className="mt-5 rounded-xl bg-secondary px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40"
      >
        {disabled ? "Uploading…" : done ? "Replace Aadhaar images" : "Upload Aadhaar"}
      </button>
    </section>
  );
}
