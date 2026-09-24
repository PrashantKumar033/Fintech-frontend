import { Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  KeyRound,
  Landmark,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserCircle,
} from "lucide-react";
import { AdminLayout, AdminPanel } from "@/components/admin/admin-layout";
import { getAdminActor } from "@/lib/admin-api";
import { getSession } from "@/lib/auth-api";
import { managementBasePath } from "@/lib/role-hierarchy";
import { useServiceReadiness } from "@/lib/service-readiness";

export function AdminProfilePage() {
  const actor = getAdminActor();
  const dedicatedSuperAdmin = actor?.kind === "SUPER_ADMIN";
  const identity = actor?.kind === "IDENTITY_ADMIN" ? getSession()?.identity : undefined;
  const base = managementBasePath(identity?.role);
  const readiness = useServiceReadiness(Boolean(identity && !dedicatedSuperAdmin));
  const status = readiness.data;
  const kycStatus = readiness.isLoading
    ? "Checking"
    : status?.kycStatus === "NOT_STARTED"
      ? "Not started"
      : status?.kycStatus === "PENDING"
        ? "Documents required"
        : status?.kycStatus === "UNDER_REVIEW"
          ? "Submitted"
          : status?.kycStatus === "APPROVED"
            ? "Approved"
            : status?.kycStatus === "REJECTED"
              ? "Changes required"
              : "Unavailable";
  const bankStatus = readiness.isLoading
    ? "Checking"
    : !status?.complianceStatusAvailable
      ? "Unavailable"
      : status.hasVerifiedBank
        ? "Verified"
        : status.hasBankAccount
          ? "Review pending"
          : "Not added";

  return (
    <AdminLayout
      active="profile"
      eyebrow="Account"
      title="My profile"
      description="Identity, mandatory compliance setup, security and access information in one workspace."
    >
      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <AdminPanel className="h-fit text-center">
          <span className="mx-auto grid h-24 w-24 place-items-center rounded-3xl bg-secondary text-3xl font-black text-white">
            {actor?.name?.charAt(0).toUpperCase() || "A"}
          </span>
          <h2 className="mt-5 text-2xl font-black">{actor?.name || "Administrator"}</h2>
          <p className="mt-1 text-xs font-extrabold uppercase tracking-wider text-primary">
            {actor?.role || "ADMIN"}
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <ProfileStat label="Session" value="Active" />
            <ProfileStat
              label="Compliance"
              value={
                dedicatedSuperAdmin
                  ? "Exempt"
                  : status?.complianceSetupComplete
                    ? "Submitted"
                    : "Required"
              }
            />
          </div>
        </AdminPanel>
        <div className="space-y-6">
          {dedicatedSuperAdmin ? (
            <AdminPanel className="border-emerald-200 bg-emerald-50/60">
              <div className="flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                  <BadgeCheck size={21} />
                </span>
                <div>
                  <h2 className="font-black">Super Admin compliance exemption</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    The dedicated Super Admin account does not need to submit personal KYC or a
                    settlement bank account. Every identity role below Super Admin must complete
                    both steps.
                  </p>
                </div>
              </div>
            </AdminPanel>
          ) : (
            <AdminPanel>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[.16em] text-primary">
                    Mandatory onboarding
                  </p>
                  <h2 className="mt-1 text-xl font-black">Complete KYC and add a bank account</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Both steps are required for every role below Super Admin. You can continue to
                    the operational workspace after KYC is submitted and a bank account is added.
                  </p>
                </div>
                <span
                  className={`w-fit whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-extrabold ${status?.complianceSetupComplete ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                >
                  {status?.complianceSetupComplete ? "SETUP SUBMITTED" : "ACTION REQUIRED"}
                </span>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <ComplianceStep
                  icon={ShieldCheck}
                  title="KYC verification"
                  status={kycStatus}
                  complete={Boolean(status?.kycSubmitted)}
                  description="Upload all mandatory documents and submit the application for review."
                  href={`${base}/profile/kyc`}
                  action={status?.kycSubmitted ? "View KYC" : "Complete KYC"}
                />
                <ComplianceStep
                  icon={Landmark}
                  title="Bank account"
                  status={bankStatus}
                  complete={Boolean(status?.hasBankAccount)}
                  description="Add a passbook-backed account for settlement and applicable services."
                  href={`${base}/profile/bank`}
                  action={status?.hasBankAccount ? "View bank account" : "Add bank account"}
                />
              </div>
            </AdminPanel>
          )}
          <AdminPanel>
            <h2 className="text-xl font-black">Account overview</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Detail
                icon={UserCircle}
                label="Display name"
                value={actor?.name || "Administrator"}
              />
              <Detail icon={ShieldCheck} label="Access level" value={actor?.role || "ADMIN"} />
              <Detail
                icon={Mail}
                label="Account type"
                value={
                  actor?.kind === "SUPER_ADMIN" ? "Dedicated Super Admin" : "Identity Administrator"
                }
              />
              <Detail icon={KeyRound} label="Authentication" value="Password or MPIN" />
            </div>
          </AdminPanel>
          <AdminPanel>
            <div className="flex items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                <LockKeyhole size={20} />
              </span>
              <div>
                <h2 className="font-black">Security controls</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Password, MPIN, TPIN, device verification and session-management actions are
                  available from your Settings workspace.
                </p>
              </div>
            </div>
          </AdminPanel>
        </div>
      </div>
    </AdminLayout>
  );
}

function ComplianceStep({
  icon: Icon,
  title,
  status,
  complete,
  description,
  href,
  action,
}: {
  icon: typeof ShieldCheck;
  title: string;
  status: string;
  complete: boolean;
  description: string;
  href: string;
  action: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-muted/45 p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-primary shadow-sm">
          <Icon size={19} />
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${complete ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
        >
          {status}
        </span>
      </div>
      <h3 className="mt-4 font-black">{title}</h3>
      <p className="mt-1 min-h-10 text-xs leading-5 text-muted-foreground">{description}</p>
      <Link
        to={href as never}
        className="mt-4 inline-flex rounded-xl bg-secondary px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-secondary/90"
      >
        {action}
      </Link>
    </div>
  );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted p-3">
      <p className="text-[10px] font-bold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-black">{value}</p>
    </div>
  );
}
function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserCircle;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border p-4">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon size={17} />
      </span>
      <div>
        <p className="text-[10px] font-bold uppercase text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-sm font-extrabold">{value}</p>
      </div>
    </div>
  );
}
