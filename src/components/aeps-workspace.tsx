import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  BadgeIndianRupee,
  Banknote,
  CheckCircle2,
  Circle,
  Clock3,
  Fingerprint,
  Landmark,
  Loader2,
  MapPin,
  ReceiptText,
  RefreshCw,
  ShieldAlert,
  WalletCards,
} from "lucide-react";
import { getSession } from "@/lib/auth-api";
import { aepsErrorMessage } from "@/lib/aeps-errors";
import {
  filterAepsBankIins,
  normalizeAepsBankIins,
  toAepsBankIinOptions,
} from "@/lib/aeps-bank-iins";
import {
  credentialsPending,
  managementBasePath,
  resolveWorkspaceRole,
  signedInHome,
  type PlatformRole,
} from "@/lib/role-hierarchy";
import {
  aepsApi,
  capturePid,
  newIdempotencyKey,
  resolveAepsWadh,
  USE_MOCK_FINGERPRINT,
  type AepsNextAction,
  type AepsStatus,
  type AepsTxnCode,
  type AuthType,
  type BiometricPayload,
  type KycProfile,
  type MasterItem,
  type SavedBank,
  type TransactionResult,
} from "@/lib/aeps-api";
import {
  buildAepsTransactionRequest,
  pidDataAfterBindingChange,
  transactionRequiresOtp,
  transactionAuthorizationFromResponse,
} from "@/lib/aeps-pid";
import {
  AEPS_MCC_OPTIONS,
  buildAepsRegistrationRequest,
  EMPTY_AEPS_REGISTRATION,
  validateAepsRegistration,
  type AepsRegistrationErrors,
  type AepsRegistrationField,
} from "@/lib/aeps-registration";
import { BusinessPage } from "@/components/business-page";
import { AdminLayout } from "@/components/admin/admin-layout";
import { ActionPermissionNotice } from "@/components/action-permission-notice";
import { useEffectiveAccess } from "@/hooks/use-effective-access";
import { UI_PERMISSION } from "@/lib/ui-permissions";
import { useServiceReadiness } from "@/lib/service-readiness";

const actionCopy: Record<AepsNextAction, string> = {
  REGISTER: "Complete merchant registration",
  OTP: "Verify merchant mobile",
  EKYC: "Complete biometric e-KYC",
  TWO_FACTOR_AUTH: "Complete today's biometric verification",
  AEPS_TRANSACTION: "AEPS services are ready",
  WAIT: "Registration is being processed",
  RETRY_REGISTRATION: "Registration needs attention",
  CONTACT_SUPPORT: "Contact support",
};

type AepsActionAccess = {
  onboarding: boolean;
  missingOnboardingPermissions: string[];
  services: Record<AepsTxnCode, boolean>;
};

const RD_DEVICE_OPTIONS = [
  { value: "mantra", label: "Mantra" },
  { value: "morpho", label: "Morpho / IDEMIA" },
  { value: "startek", label: "Startek" },
  { value: "secugen", label: "SecuGen" },
  { value: "tatvik", label: "Tatvik" },
  { value: "precision", label: "Precision" },
  { value: "evolute", label: "Evolute" },
] as const;
const CUSTOM_RD_DEVICE = "__custom_rd_device__";
const RD_CAPTURE_URL = "http://127.0.0.1:11100/rd/capture";

const onboardingSteps = [
  { key: "REGISTER", label: "Register" },
  { key: "OTP_SEND", label: "Send OTP" },
  { key: "OTP_VERIFY", label: "Verify OTP" },
  { key: "EKYC", label: "E-KYC" },
  { key: "TWO_FACTOR_AUTH", label: "2FA" },
  { key: "AEPS_TRANSACTION", label: "AEPS services" },
] as const;

function maskAadhaar(value: unknown) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits ? `XXXXXXXX${digits.slice(-4)}` : "—";
}

function completedJourneySteps(status: AepsStatus, otpSent: boolean) {
  const providerStep = status.onboardingStep || "NOT_STARTED";
  const afterOtp = [
    "OTP_VERIFIED",
    "EKYC_PENDING",
    "EKYC_COMPLETED",
    "TWO_FA_PENDING",
    "ACTIVE",
  ].includes(providerStep);
  const afterEkyc = ["EKYC_COMPLETED", "TWO_FA_PENDING", "ACTIVE"].includes(providerStep);
  const registrationComplete = ![
    "NOT_STARTED",
    "REGISTRATION_PENDING",
    "REJECTED",
    "FAILED",
  ].includes(providerStep);

  return new Set([
    ...(registrationComplete ? ["REGISTER"] : []),
    ...(otpSent || afterOtp ? ["OTP_SEND"] : []),
    ...(afterOtp ? ["OTP_VERIFY"] : []),
    ...(afterEkyc ? ["EKYC"] : []),
    ...(status.nextAction === "AEPS_TRANSACTION" ? ["TWO_FACTOR_AUTH"] : []),
  ]);
}

function activeJourneyStep(status: AepsStatus, otpSent: boolean) {
  switch (status.nextAction) {
    case "REGISTER":
    case "RETRY_REGISTRATION":
    case "WAIT":
      return "REGISTER";
    case "OTP":
      return otpSent ? "OTP_VERIFY" : "OTP_SEND";
    case "EKYC":
      return "EKYC";
    case "TWO_FACTOR_AUTH":
      return "TWO_FACTOR_AUTH";
    case "AEPS_TRANSACTION":
      return "AEPS_TRANSACTION";
    default:
      return "REGISTER";
  }
}

function AepsJourney({ status, otpSent }: { status: AepsStatus; otpSent: boolean }) {
  const completed = completedJourneySteps(status, otpSent);
  const active = activeJourneyStep(status, otpSent);
  return (
    <section className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-primary">
            Guided activation
          </p>
          <h2 className="mt-1 text-lg font-extrabold text-secondary">Your AEPS setup journey</h2>
        </div>
        {status.lastTwoFactorAuthAt && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock3 size={14} /> Last 2FA: {new Date(status.lastTwoFactorAuthAt).toLocaleString()}
          </p>
        )}
      </div>
      <ol className="mt-5 grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {onboardingSteps.map((step, index) => {
          const done = completed.has(step.key);
          const current = step.key === active;
          return (
            <li
              key={step.key}
              aria-current={current ? "step" : undefined}
              className={`rounded-xl border p-3 ${
                current
                  ? "border-primary bg-primary/5"
                  : done
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-border bg-background"
              }`}
            >
              <div className="flex items-center gap-2">
                {done ? (
                  <CheckCircle2 size={17} className="text-emerald-600" />
                ) : (
                  <Circle
                    size={17}
                    className={current ? "text-primary" : "text-muted-foreground"}
                  />
                )}
                <span className="text-[10px] font-black uppercase text-muted-foreground">
                  Step {index + 1}
                </span>
              </div>
              <p
                className={`mt-2 text-sm font-extrabold ${current ? "text-primary" : "text-secondary"}`}
              >
                {step.label}
              </p>
              <p className="mt-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                {done ? "Complete" : current ? "Do this now" : "Locked"}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

type AccountPaths = { kyc: string; bank: string };

function pathsForRole(role: PlatformRole | null): AccountPaths {
  if (!role || role === "RETAILER") return { kyc: "/retailer/kyc", bank: "/retailer/bank" };
  const base = managementBasePath(role);
  return { kyc: `${base}/profile/kyc`, bank: `${base}/profile/bank` };
}

function PrerequisiteNotice({
  kycReady,
  bankReady,
  paths,
}: {
  kycReady: boolean;
  bankReady: boolean;
  paths: AccountPaths;
}) {
  return (
    <section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
      <h2 className="font-extrabold">Complete the AEPS prerequisites</h2>
      <p className="mt-1 text-sm">
        Registration unlocks after an approved KYC profile and one active, ownership-verified bank
        account.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <a
          href={paths.kyc}
          className={`rounded-xl px-4 py-2.5 text-sm font-bold ${kycReady ? "bg-emerald-100 text-emerald-800" : "bg-white text-secondary shadow-sm"}`}
        >
          {kycReady ? "KYC approved ✓" : "Complete KYC"}
        </a>
        <a
          href={paths.bank}
          className={`rounded-xl px-4 py-2.5 text-sm font-bold ${bankReady ? "bg-emerald-100 text-emerald-800" : "bg-white text-secondary shadow-sm"}`}
        >
          {bankReady ? "Bank verified ✓" : "Verify bank account"}
        </a>
      </div>
    </section>
  );
}

export function AepsWorkspace({ requestedService }: { requestedService?: AepsTxnCode } = {}) {
  const navigate = useNavigate();
  const { can, loading: accessLoading, refresh: refreshAccess } = useEffectiveAccess();
  const currentRole = resolveWorkspaceRole(getSession()?.identity.role);
  const accountPaths = pathsForRole(currentRole);
  const canView = can(UI_PERMISSION.AEPS_VIEW);
  const onboardingPermissions = Array.from(
    new Set([
      UI_PERMISSION.AEPS_ONBOARDING,
      UI_PERMISSION.AEPS_BANKS_VIEW,
      UI_PERMISSION.AEPS_STATES_VIEW,
      UI_PERMISSION.AEPS_DISTRICTS_VIEW,
    ]),
  );
  const missingOnboardingPermissions = onboardingPermissions.filter(
    (permission) => !can(permission),
  );
  const canLoadTransactionBanks = can(UI_PERMISSION.AEPS_BANK_IINS_VIEW);
  const actionAccess: AepsActionAccess = {
    onboarding: missingOnboardingPermissions.length === 0,
    missingOnboardingPermissions,
    services: {
      BE: can(UI_PERMISSION.AEPS_BALANCE_ENQUIRY) && canLoadTransactionBanks,
      MS: can(UI_PERMISSION.AEPS_MINI_STATEMENT) && canLoadTransactionBanks,
      CW: can(UI_PERMISSION.AEPS_CASH_WITHDRAWAL) && canLoadTransactionBanks,
      AP: can(UI_PERMISSION.AEPS_AADHAAR_PAY) && canLoadTransactionBanks,
      CD: can(UI_PERMISSION.AEPS_CASH_DEPOSIT) && canLoadTransactionBanks,
    },
  };
  const [session, setSession] = useState<ReturnType<typeof getSession>>(null);
  const [status, setStatus] = useState<AepsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const readiness = useServiceReadiness(!!session && canView);
  const refresh = useCallback(async () => {
    const current = getSession();
    if (!current || !canView) {
      setLoading(false);
      return;
    }
    setRefreshing(true);
    setError("");
    try {
      setStatus(await aepsApi.status(current.accessToken));
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [canView]);
  const refreshAll = useCallback(async () => {
    await refreshAccess().catch(() => null);
    await refresh();
  }, [refresh, refreshAccess]);
  useEffect(() => {
    const current = getSession();
    if (!current) {
      navigate({ to: "/login" });
      return;
    }
    if (credentialsPending(current.identity)) {
      window.location.replace(signedInHome(current));
      return;
    }
    setSession(current);
    void refresh();
  }, [navigate, refresh]);
  if (!session) return null;
  const content =
    !accessLoading && !canView ? (
      <ActionPermissionNotice
        permission={UI_PERMISSION.AEPS_VIEW}
        title="AEPS is not enabled for this account"
      />
    ) : (
      <>
        <div className="mb-5 flex justify-end">
          <button
            onClick={refreshAll}
            disabled={loading || refreshing || accessLoading}
            className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={14}
              className={loading || refreshing || accessLoading ? "animate-spin" : ""}
            />{" "}
            Refresh access & status
          </button>
        </div>
        <div className="mb-6 rounded-2xl bg-secondary p-5 text-secondary-foreground shadow-elegant">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs text-white/60">AEPS merchant status</p>
              <p className="mt-1 text-xl font-extrabold">
                {loading
                  ? "Checking eligibility…"
                  : status
                    ? actionCopy[status.nextAction]
                    : "Status unavailable"}
              </p>
              <p className="mt-1 text-xs text-white/60">
                {status?.providerMerchantId
                  ? `Merchant ID: ${status.providerMerchantId}`
                  : "Your identity is taken securely from your login session."}
              </p>
            </div>
            <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-bold">
              {status?.status || "CHECKING"}
            </span>
          </div>
        </div>
        {error && <Notice tone="error">{error}</Notice>}
        {status && <AepsJourney status={status} otpSent={otpSent} />}
        {status &&
          ["REGISTER", "RETRY_REGISTRATION"].includes(status.nextAction) &&
          readiness.isSuccess &&
          !readiness.data.aepsUnlocked && (
            <PrerequisiteNotice
              kycReady={readiness.data.kycStatus === "APPROVED"}
              bankReady={readiness.data.hasVerifiedBank}
              paths={accountPaths}
            />
          )}
        {loading ? (
          <Loading />
        ) : status ? (
          <AepsFlow
            token={session.accessToken}
            status={status}
            refresh={refreshAll}
            access={actionAccess}
            accountPaths={accountPaths}
            onOtpSent={() => setOtpSent(true)}
            requestedService={requestedService}
          />
        ) : (
          <StateCard
            icon={<ShieldAlert />}
            title="AEPS status is unavailable"
            text="The onboarding status could not be loaded. Check the message above and try again."
            action={refresh}
          />
        )}
      </>
    );
  const pageDescription =
    "Merchant onboarding and Aadhaar-enabled transactions become available after approved KYC and a verified bank account.";
  if (currentRole && currentRole !== "RETAILER") {
    return (
      <AdminLayout
        active="aeps"
        eyebrow="AEPS"
        title="Aadhaar Enabled Payment System"
        description={pageDescription}
      >
        {content}
      </AdminLayout>
    );
  }
  return (
    <BusinessPage
      identity={session.identity}
      active="aeps"
      eyebrow="AEPS"
      title="Aadhaar Enabled Payment System"
      description={pageDescription}
    >
      {content}
    </BusinessPage>
  );
}

function AepsFlow({
  token,
  status,
  refresh,
  access,
  accountPaths,
  onOtpSent,
  requestedService,
}: {
  token: string;
  status: AepsStatus;
  refresh: () => Promise<void>;
  access: AepsActionAccess;
  accountPaths: AccountPaths;
  onOtpSent: () => void;
  requestedService?: AepsTxnCode;
}) {
  if (
    ["REGISTER", "RETRY_REGISTRATION", "OTP", "EKYC", "TWO_FACTOR_AUTH"].includes(
      status.nextAction,
    ) &&
    !access.onboarding
  ) {
    return (
      <ActionPermissionNotice
        permission={access.missingOnboardingPermissions.join(", ")}
        title="AEPS onboarding is not enabled"
        text="Ask the Super Admin to assign the AEPS onboarding and provider master-data permissions to your active package."
      />
    );
  }
  switch (status.nextAction) {
    case "REGISTER":
    case "RETRY_REGISTRATION":
      return (
        <Registration
          token={token}
          retry={status.nextAction === "RETRY_REGISTRATION"}
          done={refresh}
          accountPaths={accountPaths}
        />
      );
    case "OTP":
      return <OnboardingOtp token={token} done={refresh} onSent={onOtpSent} />;
    case "EKYC":
      return (
        <BiometricStep
          title="Merchant e-KYC"
          description="Capture a fresh fingerprint using your registered RD device."
          pipe={status.pipe}
          submit={(pidData) => aepsApi.ekyc(token, pidData)}
          done={refresh}
        />
      );
    case "TWO_FACTOR_AUTH":
      return <DailyTwoFactor token={token} pipe={status.pipe} done={refresh} />;
    case "AEPS_TRANSACTION":
      if (!status.serviceActivated) {
        return (
          <StateCard
            icon={<Loader2 className="animate-spin" />}
            title="Waiting for AEPS activation"
            text="Provider onboarding is complete, but transaction activation has not been confirmed yet. Refresh the status before starting a transaction."
            action={refresh}
          />
        );
      }
      return (
        <TransactionWorkspace
          token={token}
          providerCode={status.providerCode}
          pipe={status.pipe}
          access={access}
          requestedService={requestedService}
        />
      );
    case "WAIT":
      return (
        <StateCard
          icon={<Loader2 className="animate-spin" />}
          title="Processing registration"
          text="Please wait for the provider response. Do not submit another registration."
          action={refresh}
        />
      );
    default:
      return (
        <StateCard
          icon={<ShieldAlert />}
          title="AEPS access needs support"
          text={
            status.reason ||
            "Transactions are disabled for this merchant profile. Please contact the service desk."
          }
        />
      );
  }
}

const emptyRegistration = EMPTY_AEPS_REGISTRATION;

// Keep an unfinished form while the SPA route temporarily unmounts. This intentionally
// stays in memory instead of local/session storage because the form contains Aadhaar data.
const registrationDrafts = new Map<string, typeof emptyRegistration>();

function Registration({
  token,
  retry,
  done,
  accountPaths,
}: {
  token: string;
  retry: boolean;
  done: () => Promise<void>;
  accountPaths: AccountPaths;
}) {
  const draftKey = getSession()?.identity.id || "current-retailer";
  const [form, setFormState] = useState(
      () => registrationDrafts.get(draftKey) || emptyRegistration,
    ),
    [banks, setBanks] = useState<MasterItem[]>([]),
    [states, setStates] = useState<MasterItem[]>([]),
    [districts, setDistricts] = useState<MasterItem[]>([]),
    [shopDistricts, setShopDistricts] = useState<MasterItem[]>([]),
    [saved, setSaved] = useState<SavedBank[]>([]),
    [kyc, setKyc] = useState<KycProfile | null>(null),
    [prerequisiteErrors, setPrerequisiteErrors] = useState<string[]>([]),
    [loadingPrerequisites, setLoadingPrerequisites] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [locationError, setLocationError] = useState(""),
    [fieldErrors, setFieldErrors] = useState<AepsRegistrationErrors>({});
  const setForm = useCallback<typeof setFormState>(
    (value) => {
      setFormState((current) => {
        const next = typeof value === "function" ? value(current) : value;
        registrationDrafts.set(draftKey, next);
        return next;
      });
    },
    [draftKey],
  );
  useEffect(() => {
    let active = true;
    Promise.allSettled([
      aepsApi.banks(token),
      aepsApi.states(token),
      aepsApi.savedBanks(token),
      aepsApi.myKyc(token),
    ]).then((results) => {
      if (!active) return;
      const [bankResult, stateResult, savedResult, kycResult] = results;
      const issues: string[] = [];
      if (bankResult.status === "fulfilled") setBanks(bankResult.value);
      else issues.push(`Provider bank list: ${messageOf(bankResult.reason)}`);
      if (stateResult.status === "fulfilled") setStates(stateResult.value);
      else issues.push(`State list: ${messageOf(stateResult.reason)}`);
      if (savedResult.status === "fulfilled") {
        const eligible = savedResult.value.filter(
          (account) =>
            !account.isDeleted &&
            account.status === "ACTIVE" &&
            account.verificationStatus === "VERIFIED" &&
            account.ownershipStatus === "VERIFIED" &&
            account.accountType !== "SALARY",
        );
        setSaved(eligible);
        if (!eligible.length)
          issues.push(
            "Add an ACTIVE, VERIFIED Savings or Current bank account before AEPS registration.",
          );
      } else issues.push(`Saved bank accounts: ${messageOf(savedResult.reason)}`);
      if (kycResult.status === "fulfilled") {
        setKyc(kycResult.value);
        if (kycResult.value.status === "APPROVED")
          setForm((current) => ({ ...current, kycProfileId: kycResult.value.id }));
        else issues.push(`Your KYC must be APPROVED. Current status: ${kycResult.value.status}.`);
      } else issues.push(`KYC profile: ${messageOf(kycResult.reason)}`);
      setPrerequisiteErrors(issues);
      setLoadingPrerequisites(false);
    });
    return () => {
      active = false;
    };
  }, [setForm, token]);
  useEffect(() => {
    if (!form.merchantState) return;
    aepsApi
      .districts(token, form.merchantState)
      .then(setDistricts)
      .catch((e) => setError(messageOf(e)));
  }, [form.merchantState, token]);
  useEffect(() => {
    if (!form.shopState) return;
    aepsApi
      .districts(token, form.shopState)
      .then(setShopDistricts)
      .catch((e) => setError(messageOf(e)));
  }, [form.shopState, token]);
  const set = (name: AepsRegistrationField, value: string) => {
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  };
  const locate = () => {
    setLocationError("");
    if (!window.isSecureContext) {
      setLocationError(
        "Chrome blocks location on an insecure LAN address. Open the site through HTTPS, or use localhost on this computer, then try again.",
      );
      return;
    }
    if (!navigator.geolocation) {
      setLocationError(
        "This browser does not support location capture. Please use a supported browser or device.",
      );
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocationError("");
        setForm((f) => {
          setFieldErrors((current) => {
            const next = { ...current };
            delete next.lat;
            delete next.long;
            delete next.shopLat;
            delete next.shopLong;
            return next;
          });
          return {
            ...f,
            lat: String(p.coords.latitude),
            long: String(p.coords.longitude),
            shopLat: f.shopLat || String(p.coords.latitude),
            shopLong: f.shopLong || String(p.coords.longitude),
          };
        });
      },
      (reason) =>
        setLocationError(
          reason.code === reason.PERMISSION_DENIED
            ? "Location access was denied. Allow Location in browser site settings and try again."
            : "Current location could not be determined. Check GPS/network and try again.",
        ),
      { enableHighAccuracy: true },
    );
  };
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const validationErrors = validateAepsRegistration(form);
    if (Object.keys(validationErrors).length) {
      setFieldErrors(validationErrors);
      const coordinateFields = new Set(["lat", "long", "shopLat", "shopLong"]);
      const invalidFields = Object.keys(validationErrors);
      if (invalidFields.some((field) => coordinateFields.has(field))) {
        setLocationError(
          "Current location is required. Select Use current location and allow browser access.",
        );
      }
      const firstInvalidField = invalidFields.find((field) => !coordinateFields.has(field));
      if (firstInvalidField) {
        document.getElementById(`aeps-${firstInvalidField}`)?.focus();
      }
      return;
    }
    setFieldErrors({});
    setBusy(true);
    try {
      await aepsApi.register(token, buildAepsRegistrationRequest(form));
      registrationDrafts.delete(draftKey);
      await done();
    } catch (x) {
      const message = messageOf(x);
      setError(message);
      if (isProviderMerchantOwnershipConflict(message)) {
        try {
          await done();
        } catch {
          // Keep the provider's actionable ownership message visible even if
          // the immediate status refresh is temporarily unavailable.
        }
      }
    } finally {
      setBusy(false);
    }
  }
  const fields: Array<[keyof typeof form, string, string?]> = [
    ["firstName", "First name"],
    ["middleName", "Middle name (optional)"],
    ["lastName", "Last name (optional)"],
    ["dob", "Date of birth", "DD-MM-YYYY"],
    ["emailId", "Email", "name@example.com"],
    ["merchantPhoneNumber", "Merchant mobile", "10 digits"],
    ["merchantAddress1", "Residence address line 1"],
    ["merchantAddress2", "Residence address line 2 (optional)"],
    ["shopName", "Shop name"],
    ["motherName", "Mother's name"],
    ["fatherName", "Father's name"],
    ["merchantPinCode", "Residence PIN", "6 digits"],
    ["merchantPan", "Merchant PAN", "ABCDE1234F"],
    ["aadhaarNumber", "Merchant Aadhaar", "12 digits"],
    ["shopPan", "Shop PAN", "ABCDE1234F"],
    ["shopAddress", "Shop address"],
    ["shopPincode", "Shop PIN", "6 digits"],
  ];
  return (
    <Panel
      title={retry ? "Retry provider registration" : "Merchant registration"}
      description="Use a verified bank account and approved KYC profile. Sensitive identity details stay only in this form until submission."
    >
      <form onSubmit={submit} noValidate className="space-y-6">
        {error && <Notice tone="error">{error}</Notice>}
        {loadingPrerequisites && (
          <Notice tone="info">
            Checking approved KYC, verified bank accounts, and provider master data…
          </Notice>
        )}
        {!loadingPrerequisites && prerequisiteErrors.length > 0 && (
          <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-extrabold">Complete these prerequisites first:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {prerequisiteErrors.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              {kyc?.status !== "APPROVED" && (
                <a
                  href={accountPaths.kyc}
                  className="rounded-lg bg-white px-3 py-2 font-bold shadow-sm"
                >
                  Open KYC
                </a>
              )}
              {!saved.length && (
                <a
                  href={accountPaths.bank}
                  className="rounded-lg bg-white px-3 py-2 font-bold shadow-sm"
                >
                  Open bank accounts
                </a>
              )}
            </div>
          </div>
        )}
        {kyc?.status === "APPROVED" && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
            <CheckCircle2 size={18} /> Approved KYC selected automatically
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SelectField
            label="Verified settlement bank"
            value={form.bankAccountId}
            onChange={(v) => set("bankAccountId", v)}
            fieldId="aeps-bankAccountId"
            error={fieldErrors.bankAccountId}
            options={saved.map((b) => ({
              value: b.id,
              label: `${b.bankName || "Bank account"} ••••${b.accountNumberLast4 || ""} (${b.accountType || ""})`,
            }))}
          />
          <SelectField
            label="AEPS registration bank"
            value={form.bankCode}
            onChange={(v) => set("bankCode", v)}
            fieldId="aeps-bankCode"
            error={fieldErrors.bankCode}
            options={banks
              .filter((bank) => bank.code !== undefined && bank.code !== null)
              .map((bank) => ({ value: String(bank.code), label: bank.description }))}
          />
          {fields.map(([name, label, placeholder]) => (
            <Field
              key={name}
              label={label}
              value={form[name]}
              placeholder={placeholder}
              fieldId={`aeps-${name}`}
              error={fieldErrors[name]}
              onChange={(v) =>
                set(name, sensitive(name) ? digits(v) : pan(name) ? v.toUpperCase() : v)
              }
              required={!label.includes("optional")}
            />
          ))}
          <SelectField
            label="Gender"
            value={form.gender}
            onChange={(v) => set("gender", v)}
            fieldId="aeps-gender"
            error={fieldErrors.gender}
            options={[
              { value: "M", label: "Male" },
              { value: "F", label: "Female" },
              { value: "O", label: "Other" },
            ]}
          />
          <SelectField
            label="Marital status"
            value={form.maritalStatus}
            onChange={(v) => set("maritalStatus", v)}
            fieldId="aeps-maritalStatus"
            error={fieldErrors.maritalStatus}
            options={[
              { value: "SINGLE", label: "Single" },
              { value: "MARRIED", label: "Married" },
            ]}
          />
          <SelectField
            label="Merchant category (MCC)"
            value={form.mcc}
            onChange={(v) => set("mcc", v)}
            fieldId="aeps-mcc"
            error={fieldErrors.mcc}
            options={AEPS_MCC_OPTIONS.map((mcc) => ({ value: mcc, label: mcc }))}
          />
          <SelectField
            label="Residence state"
            value={form.merchantState}
            fieldId="aeps-merchantState"
            error={fieldErrors.merchantState}
            onChange={(v) => {
              set("merchantState", v);
              set("merchantDistrict", "");
            }}
            options={states.map(masterOption)}
          />
          <SelectField
            label="Residence district"
            value={form.merchantDistrict}
            onChange={(v) => set("merchantDistrict", v)}
            fieldId="aeps-merchantDistrict"
            error={fieldErrors.merchantDistrict}
            options={districts.map(masterOption)}
          />
          <SelectField
            label="Shop state"
            value={form.shopState}
            fieldId="aeps-shopState"
            error={fieldErrors.shopState}
            onChange={(v) => {
              set("shopState", v);
              set("shopDistrict", "");
            }}
            options={states.map(masterOption)}
          />
          <SelectField
            label="Shop district"
            value={form.shopDistrict}
            onChange={(v) => set("shopDistrict", v)}
            fieldId="aeps-shopDistrict"
            error={fieldErrors.shopDistrict}
            options={shopDistricts.map(masterOption)}
          />
        </div>
        <button
          type="button"
          onClick={locate}
          className="flex items-center gap-2 text-sm font-bold text-primary"
        >
          <MapPin size={16} />
          {form.lat && form.long ? "Location captured" : "Use current location"}
        </button>
        {locationError && (
          <p role="alert" className="-mt-4 text-xs font-semibold text-red-700">
            {locationError}
          </p>
        )}
        <Submit
          busy={busy}
          disabled={loadingPrerequisites || prerequisiteErrors.length > 0}
          busyLabel="Submitting registration"
        >
          Submit registration
        </Submit>
      </form>
    </Panel>
  );
}

function OnboardingOtp({
  token,
  done,
  onSent,
}: {
  token: string;
  done: () => Promise<void>;
  onSent: () => void;
}) {
  const [otp, setOtp] = useState(""),
    [sent, setSent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [developmentOtp, setDevelopmentOtp] = useState("");
  const send = async (resend = false) => {
    setBusy(true);
    setError("");
    setDevelopmentOtp("");
    try {
      const result = await aepsApi.sendOtp(token, resend);
      const testOtp = String(result.developmentOtp ?? "").trim();
      if (/^\d{4,8}$/.test(testOtp)) {
        setDevelopmentOtp(testOtp);
        setOtp(testOtp);
      }
      setSent(true);
      onSent();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };
  const verify = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await aepsApi.verifyOtp(token, otp);
      setOtp("");
      await done();
    } catch (x) {
      setError(messageOf(x));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Panel
      title="Merchant OTP verification"
      description="Send the onboarding OTP to the registered merchant mobile, then verify it here."
    >
      {error && <Notice tone="error">{error}</Notice>}
      {developmentOtp ? (
        <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
          <p className="text-xs font-black uppercase">Development OTP</p>
          <p className="mt-1 text-2xl font-black tracking-[0.3em]">{developmentOtp}</p>
          <p className="mt-1 text-xs font-semibold">
            SMS service is disabled. This test OTP has been filled in automatically.
          </p>
        </div>
      ) : null}
      <div className="mb-6 rounded-xl bg-muted/35 px-4 py-4 sm:px-5">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
          How it works
        </p>
        <ol
          aria-label="OTP verification steps"
          className="mt-3 grid gap-4 sm:grid-cols-[minmax(0,1fr)_2rem_minmax(0,1fr)] sm:items-center"
        >
          <li className="flex items-start gap-3">
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-black ${
                sent ? "bg-emerald-100 text-emerald-700" : "bg-secondary text-white"
              }`}
            >
              {sent ? <CheckCircle2 size={17} aria-hidden="true" /> : "1"}
            </span>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
                Send OTP
              </p>
              <p className="mt-0.5 text-sm font-semibold text-secondary">
                {sent ? "OTP request sent successfully" : "Request an OTP from provider"}
              </p>
            </div>
          </li>
          <li aria-hidden="true" className="hidden sm:block">
            <span className="block h-px bg-border" />
          </li>
          <li className="flex items-start gap-3">
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-black ${
                sent
                  ? "bg-secondary text-white"
                  : "bg-background text-muted-foreground ring-1 ring-border"
              }`}
            >
              2
            </span>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
                Verify OTP
              </p>
              <p className="mt-0.5 text-sm font-semibold text-secondary">
                Enter the OTP received by the merchant
              </p>
            </div>
          </li>
        </ol>
      </div>
      <form onSubmit={verify} className="mt-5 max-w-md space-y-4">
        <Field
          label="OTP"
          value={otp}
          onChange={(v) => setOtp(digits(v).slice(0, 8))}
          placeholder="Enter provider OTP"
          required
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => send(sent)}
            className="cursor-pointer rounded-xl border border-secondary py-3 text-sm font-bold text-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sent ? "Resend OTP" : "Send OTP"}
          </button>
          <button
            disabled={busy || !otp}
            className="cursor-pointer rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Please wait…" : "Verify OTP"}
          </button>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Already received an OTP before reopening this page? Enter it directly and select Verify
          OTP.
        </p>
      </form>
    </Panel>
  );
}

function BiometricStep({
  title,
  description,
  pipe,
  submit,
  done,
}: {
  title: string;
  description: string;
  pipe: string;
  submit: (pid: string) => Promise<unknown>;
  done: () => Promise<void>;
}) {
  const [pid, setPid] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const run = async () => {
    setBusy(true);
    setError("");
    try {
      await submit(pid);
      setPid("");
      await done();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Panel title={title} description={description}>
      {error && <Notice tone="error">{error}</Notice>}
      <Capture value={pid} onChange={setPid} pipe={pipe} />
      <button
        disabled={!pid || busy}
        onClick={run}
        className="mt-5 w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
      >
        {busy ? "Submitting…" : "Submit biometric verification"}
      </button>
    </Panel>
  );
}

function DailyTwoFactor({
  token,
  pipe,
  done,
}: {
  token: string;
  pipe: string;
  done: () => Promise<void>;
}) {
  const [aadhaar, setAadhaar] = useState(""),
    [lat, setLat] = useState(""),
    [long, setLong] = useState(""),
    [pid, setPid] = useState(""),
    [deviceType, setDeviceType] = useState("mantra"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [requestKey, setRequestKey] = useState("");
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (p) => {
        setLat(String(p.coords.latitude));
        setLong(String(p.coords.longitude));
        setPid("");
      },
      () => setError("Location access is required for daily AEPS verification."),
      { enableHighAccuracy: true },
    );
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^\d{12}$/.test(aadhaar)) {
      setError("Merchant Aadhaar number must contain exactly 12 digits.");
      return;
    }
    if (!deviceType.trim() || !pid) {
      setError("Select the RD device and capture a fresh biometric PID.");
      return;
    }
    if (!/^-?\d+(\.\d+)?$/.test(lat) || !/^-?\d+(\.\d+)?$/.test(long)) {
      setError("Allow location access in your browser to continue.");
      return;
    }
    setBusy(true);
    try {
      const activeRequestKey = requestKey || newIdempotencyKey();
      if (!requestKey) setRequestKey(activeRequestKey);
      await aepsApi.twoFactor(
        token,
        {
          aadhaarNumber: aadhaar,
          deviceType,
          pidData: pid,
          lat,
          long,
        },
        activeRequestKey,
      );
      setAadhaar("");
      setPid("");
      setRequestKey("");
      await done();
    } catch (x) {
      setError(messageOf(x));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Panel
      title="Daily merchant verification"
      description="The AEPS provider requires one fresh biometric 2FA per India calendar day."
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <Notice tone="error">{error}</Notice>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Merchant Aadhaar"
            value={aadhaar}
            onChange={(v) => {
              setAadhaar(digits(v).slice(0, 12));
              setPid("");
              setRequestKey("");
            }}
            required
          />
          <RdDeviceField
            value={deviceType}
            onChange={(value) => {
              setDeviceType(value);
              setPid("");
              setRequestKey("");
            }}
            required
          />
          <LocationStatus
            lat={lat}
            long={long}
            onCapture={(la, lo) => {
              setLat(la);
              setLong(lo);
              setPid("");
              setError("");
              setRequestKey("");
            }}
          />
        </div>
        <Capture
          value={pid}
          pipe={pipe}
          includeWadh={false}
          onChange={(value) => {
            setPid(value);
            setRequestKey("");
          }}
        />
        <Submit busy={busy} disabled={!pid} busyLabel="Processing your transaction">
          Complete daily 2FA
        </Submit>
      </form>
    </Panel>
  );
}

const services: Array<{
  code: AepsTxnCode;
  title: string;
  icon: typeof Banknote;
  financial: boolean;
  permission: string;
}> = [
  {
    code: "BE",
    title: "Balance Enquiry",
    icon: WalletCards,
    financial: false,
    permission: UI_PERMISSION.AEPS_BALANCE_ENQUIRY,
  },
  {
    code: "MS",
    title: "Mini Statement",
    icon: ReceiptText,
    financial: false,
    permission: UI_PERMISSION.AEPS_MINI_STATEMENT,
  },
  {
    code: "CW",
    title: "Cash Withdrawal",
    icon: Banknote,
    financial: true,
    permission: UI_PERMISSION.AEPS_CASH_WITHDRAWAL,
  },
  {
    code: "AP",
    title: "Aadhaar Pay",
    icon: BadgeIndianRupee,
    financial: true,
    permission: UI_PERMISSION.AEPS_AADHAAR_PAY,
  },
  {
    code: "CD",
    title: "Cash Deposit",
    icon: Landmark,
    financial: true,
    permission: UI_PERMISSION.AEPS_CASH_DEPOSIT,
  },
];

function TransactionWorkspace({
  token,
  providerCode,
  pipe,
  access,
  requestedService,
}: {
  token: string;
  providerCode: string;
  pipe: string;
  access: AepsActionAccess;
  requestedService?: AepsTxnCode;
}) {
  const requestedServiceAllowed = Boolean(requestedService && access.services[requestedService]);
  const [operation, setOperation] = useState<AepsTxnCode | null>(() =>
      requestedServiceAllowed ? requestedService! : null,
    ),
    [result, setResult] = useState<TransactionResult | null>(null);
  useEffect(() => {
    if (!requestedService || !requestedServiceAllowed) return;
    setResult(null);
    setOperation(requestedService);
  }, [requestedService, requestedServiceAllowed]);
  if (result)
    return (
      <Receipt
        result={result}
        again={() => {
          setResult(null);
          setOperation(null);
        }}
      />
    );
  if (operation)
    return (
      <TransactionForm
        key={`${providerCode}:${operation}`}
        token={token}
        providerCode={providerCode}
        pipe={pipe}
        operation={operation}
        done={setResult}
        cancel={() => setOperation(null)}
        allowed={access.services[operation]}
      />
    );
  return (
    <Panel
      title="AEPS services"
      description="Choose a service. Every biometric capture must be fresh for the current transaction."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map(({ code, title, icon: Icon, financial, permission }) => (
          <button
            key={code}
            type="button"
            disabled={!access.services[code]}
            title={access.services[code] ? title : `Requires ${permission}`}
            onClick={() => access.services[code] && setOperation(code)}
            className="group rounded-2xl border border-border bg-background p-5 text-left transition enabled:hover:-translate-y-0.5 enabled:hover:border-primary/50 enabled:hover:shadow-soft disabled:cursor-not-allowed disabled:opacity-45"
          >
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-mint text-secondary group-hover:bg-primary group-hover:text-white">
              <Icon />
            </span>
            <h3 className="mt-4 font-extrabold text-secondary">{title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {financial
                ? "₹100–₹10,000 • protected against duplicate debit"
                : "Fresh biometric authentication required"}
            </p>
          </button>
        ))}
      </div>
      <div className="mt-6 flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-xs text-amber-900">
        <ShieldAlert size={17} className="shrink-0" /> Never retry PENDING or UNKNOWN financial
        transactions. Use the platform reference shown on the receipt for support.
      </div>
    </Panel>
  );
}

function TransactionForm({
  token,
  providerCode,
  pipe,
  operation,
  done,
  cancel,
  allowed,
}: {
  token: string;
  providerCode: string;
  pipe: string;
  operation: AepsTxnCode;
  done: (r: TransactionResult) => void;
  cancel: () => void;
  allowed: boolean;
}) {
  const service = services.find((x) => x.code === operation)!;
  const needsAmount = service.financial;
  const [form, setForm] = useState<BiometricPayload & { amount: string }>({
    aadhaarNumber: "",
    mobileNumber: "",
    bankIIN: "",
    amount: "",
    lat: "",
    long: "",
    deviceType: "mantra",
    pidData: "",
  });
  const [authType, setAuthType] = useState<AuthType>("BA"),
    [iins, setIins] = useState<MasterItem[]>([]),
    [bankSearch, setBankSearch] = useState(""),
    [otp, setOtp] = useState(""),
    [auth, setAuth] = useState<{ authRequestId: string; expiresAt: string } | null>(null),
    [otpNotRequired, setOtpNotRequired] = useState(false),
    [intentKey, setIntentKey] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const highValue = (operation === "CW" || operation === "AP") && Number(form.amount) > 5_000;
  const otpRequired =
    transactionRequiresOtp(operation, form.amount, pipe, form.bankIIN) && !otpNotRequired;
  const airtelPipe4Bypass = highValue && pipe === "4" && form.bankIIN === "607094" && !otpRequired;
  const visibleIins = filterAepsBankIins(iins, bankSearch);
  const previousPipeRef = useRef(pipe);
  useEffect(() => {
    let cancelled = false;
    aepsApi
      .bankIins(token, providerCode, operation, authType)
      .then((items) => {
        if (cancelled) return;
        setIins(normalizeAepsBankIins(items));
        setError("");
      })
      .catch((e) => {
        if (cancelled) return;
        setIins([]);
        const message = messageOf(e);
        setError(
          /no template found/i.test(message)
            ? `${service.title} is not configured for this provider account. Ask the administrator or provider to enable its transaction template.`
            : message,
        );
      });
    return () => {
      cancelled = true;
    };
  }, [authType, operation, providerCode, service.title, token]);
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition((p) =>
      setForm((f) => ({
        ...f,
        lat: String(p.coords.latitude),
        long: String(p.coords.longitude),
        pidData: "",
      })),
    );
  }, []);
  useEffect(() => {
    if (previousPipeRef.current === pipe) return;
    previousPipeRef.current = pipe;
    setForm((current) => ({ ...current, pidData: "" }));
    setAuth(null);
    setOtp("");
    setOtpNotRequired(false);
    setIntentKey("");
  }, [pipe]);
  const set = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value, ...(key === "pidData" ? {} : { pidData: "" }) }));
    setIntentKey("");
    if (key !== "pidData" && key !== "deviceType") {
      setAuth(null);
      setOtp("");
      setOtpNotRequired(false);
    }
  };
  const requestOtp = async () => {
    if (!allowed) return setError(`Permission ${service.permission} is required.`);
    if (!otpRequired) return;
    setBusy(true);
    setError("");
    try {
      const a = await aepsApi.transactionOtp(token, operation as "CW" | "AP", {
        aadhaarNumber: form.aadhaarNumber,
        mobileNumber: form.mobileNumber,
        amount: form.amount,
        bankIIN: form.bankIIN,
        lat: form.lat,
        long: form.long,
        appPlatform: "web",
        appVersion: "1.0.0",
      });
      setAuth(transactionAuthorizationFromResponse(a));
      setOtp("");
      setForm((f) => ({ ...f, pidData: "" }));
    } catch (e) {
      const message = messageOf(e);
      if (message.includes("VIMOPAY_TRANSACTION_OTP_NOT_REQUIRED")) {
        setAuth(null);
        setOtp("");
        setOtpNotRequired(true);
        setForm((current) => ({ ...current, pidData: "" }));
        setError("This bank and pipe do not require transaction OTP. Capture a fresh biometric.");
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  };
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!allowed) return setError(`Permission ${service.permission} is required.`);
    const amount = Number(form.amount);
    if (needsAmount && (!Number.isFinite(amount) || amount < 100 || amount > 10_000)) {
      setError("Amount must be between ₹100 and ₹10,000.");
      return;
    }
    if (form.aadhaarNumber.length !== 12 || form.mobileNumber.length !== 10) {
      setError("Enter a valid 12-digit Aadhaar number and 10-digit mobile number.");
      return;
    }
    if (!form.bankIIN || !form.lat || !form.long) {
      setError("Select the customer bank and allow location access before continuing.");
      return;
    }
    if (otpRequired && !auth) {
      await requestOtp();
      return;
    }
    if (otpRequired && auth && new Date(auth.expiresAt).getTime() <= Date.now()) {
      setAuth(null);
      setOtp("");
      setError("The transaction authorization expired. Request a new OTP before continuing.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const body = buildAepsTransactionRequest(
        form,
        needsAmount,
        otpRequired ? auth || undefined : undefined,
      );
      const key = service.financial ? intentKey || newIdempotencyKey() : undefined;
      if (key && !intentKey) setIntentKey(key);
      done(await aepsApi.transact(token, operation, body, key));
      setIntentKey("");
      setForm((f) => ({ ...f, aadhaarNumber: "", pidData: "" }));
      setOtp("");
    } catch (x) {
      setError(messageOf(x));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Panel
      title={service.title}
      description="Customer Aadhaar and biometric data are held only in memory and are never stored by this page."
    >
      <form onSubmit={submit} className="space-y-5">
        {error && <Notice tone="error">{error}</Notice>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            label="Customer Aadhaar"
            value={form.aadhaarNumber}
            onChange={(v) => set("aadhaarNumber", digits(v).slice(0, 12))}
            required
          />
          <Field
            label="Customer mobile"
            value={form.mobileNumber}
            onChange={(v) => set("mobileNumber", digits(v).slice(0, 10))}
            required
          />
          {needsAmount && (
            <Field
              label="Amount (₹100–₹10,000)"
              value={form.amount}
              onChange={(v) => set("amount", v.replace(/[^\d.]/g, ""))}
              required
            />
          )}
          <SelectField
            label="Authentication"
            value={authType}
            onChange={(v) => {
              setAuthType(v as AuthType);
              setForm((current) => ({ ...current, bankIIN: "", pidData: "" }));
              setBankSearch("");
              setAuth(null);
              setOtp("");
              setOtpNotRequired(false);
              setIntentKey("");
            }}
            options={[{ value: "BA", label: "Fingerprint / biometric" }]}
          />
          <Field
            label="Search customer bank"
            value={bankSearch}
            onChange={(value) => {
              setBankSearch(value);
              if (form.bankIIN) set("bankIIN", "");
            }}
            placeholder="Bank name or IIN"
          />
          <SelectField
            label="Customer bank"
            value={form.bankIIN}
            onChange={(v) => set("bankIIN", v)}
            options={toAepsBankIinOptions(visibleIins)}
          />
          <RdDeviceField value={form.deviceType} onChange={(v) => set("deviceType", v)} />
          <LocationStatus
            lat={form.lat}
            long={form.long}
            onCapture={(la, lo) => {
              setForm((current) => ({ ...current, lat: la, long: lo, pidData: "" }));
              setAuth(null);
              setOtp("");
              setOtpNotRequired(false);
              setIntentKey("");
            }}
          />
        </div>
        {otpRequired && !auth && (
          <Notice tone="info">
            Amounts above ₹5,000 require an OTP sent to the mobile number registered with the
            customer&apos;s Aadhaar. Submit the details below to request it before biometric PID
            capture.
          </Notice>
        )}
        {airtelPipe4Bypass && (
          <Notice tone="info">
            Airtel Payments Bank on Pipe 4 does not require transaction OTP. Capture a fresh
            fingerprint to continue.
          </Notice>
        )}
        {otpRequired && auth && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-bold text-emerald-800">Transaction OTP sent</p>
            <p className="mt-1 text-xs text-emerald-700">
              The OTP was sent to the mobile number registered with the customer&apos;s Aadhaar.
              Authorization expires {new Date(auth.expiresAt).toLocaleString()}. Enter it below; it
              is passed only in the RD device PID capture request.
            </p>
            <div className="mt-3">
              <Field
                label="Provider OTP for RD capture"
                value={otp}
                onChange={(v) => {
                  const nextOtp = digits(v).slice(0, 8);
                  setForm((f) => ({
                    ...f,
                    pidData: pidDataAfterBindingChange(f.pidData, otp, nextOtp),
                  }));
                  setOtp(nextOtp);
                  setIntentKey("");
                }}
                required
              />
            </div>
          </div>
        )}
        {(!otpRequired || auth) && (
          <Capture
            value={form.pidData}
            pipe={pipe}
            includeWadh={false}
            onChange={(v) => set("pidData", v)}
            otp={otpRequired && auth ? otp : undefined}
          />
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={cancel}
            className="flex-1 rounded-xl border border-border py-3 text-sm font-bold"
          >
            Cancel
          </button>
          <button
            disabled={!allowed || busy || ((!otpRequired || !!auth) && !form.pidData)}
            aria-busy={busy}
            className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <>
                <Loader2 size={17} className="animate-spin" aria-hidden="true" />
                <span>
                  {otpRequired && !auth
                    ? "Requesting transaction OTP"
                    : "Processing your transaction"}
                </span>
              </>
            ) : otpRequired && !auth ? (
              "Send transaction OTP"
            ) : (
              `Confirm ${service.title}`
            )}
          </button>
        </div>
      </form>
    </Panel>
  );
}

function Capture({
  value,
  onChange,
  pipe,
  otp,
  includeWadh = true,
}: {
  value: string;
  onChange: (v: string) => void;
  pipe: string;
  otp?: string;
  includeWadh?: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const previousPipeRef = useRef(pipe);
  onChangeRef.current = onChange;
  valueRef.current = value;
  let configurationError = "";
  if (includeWadh) {
    try {
      resolveAepsWadh(pipe);
    } catch (e) {
      configurationError = messageOf(e);
    }
  }
  useEffect(() => {
    if (previousPipeRef.current !== pipe) {
      onChangeRef.current(
        pidDataAfterBindingChange(valueRef.current, previousPipeRef.current, pipe),
      );
      setError("");
      previousPipeRef.current = pipe;
    }
  }, [pipe]);
  const run = async () => {
    setBusy(true);
    setError("");
    try {
      onChange(await capturePid(RD_CAPTURE_URL, pipe, otp, includeWadh));
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-background to-mint/60 shadow-sm">
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-secondary text-white shadow-sm">
            <Fingerprint size={25} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-extrabold text-secondary">
                {USE_MOCK_FINGERPRINT
                  ? "Test biometric (development)"
                  : "Registered biometric device"}
              </p>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide ${
                  value
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-background/90 text-muted-foreground ring-1 ring-border"
                }`}
              >
                {value ? <CheckCircle2 size={13} aria-hidden="true" /> : null}
                {value ? "Fingerprint captured" : "Ready to capture"}
              </span>
            </div>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              {USE_MOCK_FINGERPRINT
                ? "Fingerprint scanner is bypassed for local testing only."
                : "Place the finger on the registered scanner and capture a fresh biometric for this request."}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-white/80 bg-background/80 p-3 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 px-1 text-xs font-semibold text-muted-foreground">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-600" aria-hidden="true" />
            <span>Secure device connection is handled automatically.</span>
          </div>
          <button
            type="button"
            disabled={busy || Boolean(configurationError) || (!!otp === false && otp !== undefined)}
            onClick={run}
            aria-busy={busy}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-secondary px-6 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : null}
            {busy
              ? "Capturing fingerprint"
              : USE_MOCK_FINGERPRINT
                ? value
                  ? "Generate test fingerprint again"
                  : "Use test fingerprint"
                : value
                  ? "Capture again"
                  : "Capture fingerprint"}
          </button>
        </div>
      </div>
      {otp !== undefined && !otp && (
        <p className="border-t border-amber-200 bg-amber-50 px-5 py-3 text-xs font-semibold text-amber-800 sm:px-6">
          Enter the provider OTP before biometric capture.
        </p>
      )}
      {(configurationError || error) && (
        <p
          role="alert"
          className="border-t border-red-200 bg-red-50 px-5 py-3 text-xs font-semibold text-red-700 sm:px-6"
        >
          {configurationError || error}
        </p>
      )}
    </div>
  );
}

function Receipt({ result, again }: { result: TransactionResult; again: () => void }) {
  const detail = result.result || result;
  const providerStatus = String(detail.status || result.status || "").toUpperCase();
  const success = providerStatus === "000" || providerStatus === "SUCCESS";
  const pending =
    providerStatus === "PENDING" ||
    providerStatus === "UNKNOWN" ||
    result.settlement?.status === "PENDING";
  return (
    <Panel
      title={
        success ? "Transaction successful" : pending ? "Transaction pending" : "Transaction result"
      }
      description="Keep the Nexus platform reference for support and transaction tracking."
    >
      <div
        className={`rounded-2xl p-6 text-center ${success ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}
      >
        <CheckCircle2 className="mx-auto" size={42} />
        <p className="mt-3 text-sm font-bold">
          {String(
            detail.statusDescription || detail.npciMessage || result.message || "Response received",
          )}
        </p>
        {detail.availableBalance != null && (
          <p className="mt-2 text-3xl font-extrabold">₹{String(detail.availableBalance)}</p>
        )}
      </div>
      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ["Platform reference", result.transactionReferenceId],
          [
            "Provider reference",
            result.providerReference ?? detail.providerReference ?? detail.providerTxnRefId,
          ],
          ["Provider merchant reference", result.merchantRefId],
          ["Transaction type", result.transactionType],
          ["Amount", result.amount ? `₹${result.amount}` : undefined],
          [
            "Gross amount",
            result.accounting?.grossAmount ? `₹${result.accounting.grossAmount}` : undefined,
          ],
          [
            "Commission",
            result.accounting?.commissionAmount
              ? `₹${result.accounting.commissionAmount}`
              : undefined,
          ],
          [
            "Net principal",
            result.accounting?.netPrincipalAmount
              ? `₹${result.accounting.netPrincipalAmount}`
              : undefined,
          ],
          ["Settlement", result.settlement?.status],
          ["Wallet reference", result.settlement?.transactionReference],
          ["Commission status", result.commission?.status],
          ["Commission reference", result.commission?.commissionReference],
          ["RRN", detail.rrn],
          ["NPCI code", detail.npciCode],
          ["Aadhaar", maskAadhaar(detail.aadhaarLast4 ?? detail.aadhaarNo)],
        ]
          .filter(([, v]) => v != null)
          .map(([k, v]) => (
            <div key={String(k)} className="rounded-xl border border-border p-4">
              <dt className="text-xs text-muted-foreground">{String(k)}</dt>
              <dd className="mt-1 break-all text-sm font-bold text-secondary">{String(v)}</dd>
            </div>
          ))}
      </dl>
      {detail.transactionList != null && (
        <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-muted p-4 text-xs">
          {String(detail.transactionList)}
        </pre>
      )}
      <button
        onClick={again}
        className="mt-5 w-full rounded-xl bg-primary py-3 text-sm font-bold text-white"
      >
        Done
      </button>
    </Panel>
  );
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-7">
      <h2 className="text-2xl font-extrabold text-secondary">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function LocationStatus({
  lat,
  long,
  onCapture,
}: {
  lat: string;
  long: string;
  onCapture: (lat: string, long: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);
  const captured = !!lat && !!long;
  const capture = () => {
    if (!navigator.geolocation) {
      setDenied(true);
      return;
    }
    setBusy(true);
    setDenied(false);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        onCapture(String(p.coords.latitude), String(p.coords.longitude));
        setBusy(false);
      },
      () => {
        setDenied(true);
        setBusy(false);
      },
      { enableHighAccuracy: true },
    );
  };
  return (
    <div className="sm:col-span-2">
      <span className="text-xs font-bold text-muted-foreground">Location</span>
      <div
        className={`mt-1.5 flex items-center justify-between gap-3 rounded-xl border px-3 py-3 text-sm font-semibold ${
          captured
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-amber-200 bg-amber-50 text-amber-800"
        }`}
      >
        <span className="flex items-center gap-2">
          {captured ? <CheckCircle2 size={16} /> : <MapPin size={16} />}
          {captured
            ? "Location captured"
            : denied
              ? "Location access is blocked. Allow it in browser site settings."
              : "Waiting for location permission…"}
        </span>
        {!captured && (
          <button
            type="button"
            onClick={capture}
            disabled={busy}
            className="rounded-lg border border-amber-300 bg-white px-3 py-1 text-xs font-bold disabled:opacity-50"
          >
            {busy ? "Checking…" : "Try again"}
          </button>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  fieldId,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  fieldId?: string;
  error?: string;
}) {
  const errorId = fieldId ? `${fieldId}-error` : undefined;
  return (
    <label className="block">
      <span className="text-xs font-bold text-muted-foreground">{label}</span>
      <input
        id={fieldId}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={`mt-1.5 w-full rounded-xl border bg-background px-3 py-3 text-sm outline-none focus:ring-2 ${
          error
            ? "border-red-500 focus:border-red-500 focus:ring-red-100"
            : "border-border focus:border-primary focus:ring-primary/10"
        }`}
      />
      {error && (
        <span id={errorId} role="alert" className="mt-1.5 block text-xs font-semibold text-red-700">
          {error}
        </span>
      )}
    </label>
  );
}
function SelectField({
  label,
  value,
  onChange,
  options,
  fieldId,
  error,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ key?: string; value: string; label: string }>;
  fieldId?: string;
  error?: string;
  required?: boolean;
}) {
  const errorId = fieldId ? `${fieldId}-error` : undefined;
  return (
    <label className="block">
      <span className="text-xs font-bold text-muted-foreground">{label}</span>
      <select
        id={fieldId}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={`mt-1.5 w-full rounded-xl border bg-background px-3 py-3 text-sm outline-none ${
          error ? "border-red-500 focus:border-red-500" : "border-border focus:border-primary"
        }`}
      >
        <option value="">Select…</option>
        {options.map((o, index) => (
          <option key={o.key ?? `${o.value}:${o.label}:${index}`} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && (
        <span id={errorId} role="alert" className="mt-1.5 block text-xs font-semibold text-red-700">
          {error}
        </span>
      )}
    </label>
  );
}

function RdDeviceField({
  value,
  onChange,
  required = true,
}: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  const isKnownDevice = (candidate: string) =>
    RD_DEVICE_OPTIONS.some((device) => device.value === candidate.trim().toLowerCase());
  const [custom, setCustom] = useState(Boolean(value) && !isKnownDevice(value));

  return (
    <div className="space-y-2">
      <SelectField
        label="RD device type"
        value={custom ? CUSTOM_RD_DEVICE : value.trim().toLowerCase()}
        onChange={(selected) => {
          if (selected === CUSTOM_RD_DEVICE) {
            setCustom(true);
            onChange("");
            return;
          }
          setCustom(false);
          onChange(selected);
        }}
        required={required}
        options={[...RD_DEVICE_OPTIONS, { value: CUSTOM_RD_DEVICE, label: "Other RD device" }]}
      />
      {custom && (
        <Field
          label="RD device/provider name"
          value={value}
          onChange={onChange}
          placeholder="Enter the provider device type"
          required
        />
      )}
    </div>
  );
}
function Submit({
  busy,
  disabled = false,
  busyLabel = "Processing your transaction",
  children,
}: {
  busy: boolean;
  disabled?: boolean;
  busyLabel?: string;
  children: ReactNode;
}) {
  return (
    <button
      disabled={busy || disabled}
      aria-busy={busy}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy ? (
        <>
          <Loader2 size={17} className="animate-spin" aria-hidden="true" />
          <span>{busyLabel}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
function Notice({ tone, children }: { tone: "error" | "info"; children: ReactNode }) {
  return (
    <div
      className={`mb-4 rounded-xl p-4 text-sm font-semibold ${tone === "error" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-800"}`}
    >
      {children}
    </div>
  );
}
function Loading() {
  return (
    <div className="grid min-h-64 place-items-center">
      <Loader2 className="animate-spin text-primary" />
    </div>
  );
}
function StateCard({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  action?: () => Promise<void>;
}) {
  return (
    <Panel title={title} description={text}>
      <div className="grid place-items-center gap-4 py-8 text-primary">
        {icon}
        {action && (
          <button
            onClick={action}
            className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white"
          >
            Check again
          </button>
        )}
      </div>
    </Panel>
  );
}
function messageOf(error: unknown) {
  return aepsErrorMessage(error);
}
function isProviderMerchantOwnershipConflict(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("merchant id") &&
    normalized.includes("linked") &&
    normalized.includes("another account")
  );
}
function digits(value: string) {
  return value.replace(/\D/g, "");
}
function sensitive(name: AepsRegistrationField) {
  return ["merchantPhoneNumber", "merchantPinCode", "aadhaarNumber", "shopPincode"].includes(name);
}
function pan(name: AepsRegistrationField) {
  return name === "merchantPan" || name === "shopPan";
}
function masterOption(item: MasterItem) {
  return { value: item.code || "", label: item.description };
}
