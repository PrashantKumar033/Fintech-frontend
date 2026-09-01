import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowLeft,
  BadgeIndianRupee,
  Banknote,
  CheckCircle2,
  Fingerprint,
  Landmark,
  Loader2,
  MapPin,
  ReceiptText,
  RefreshCw,
  ShieldAlert,
  WalletCards,
} from "lucide-react";
import { ApiError, getSession } from "@/lib/auth-api";
import {
  aepsApi,
  capturePid,
  newIdempotencyKey,
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
import { BusinessPage } from "@/components/business-page";
import { useServiceReadiness } from "@/lib/service-readiness";

export const Route = createFileRoute("/aeps")({
  head: () => ({ meta: [{ title: "VimoPay AEPS — UMOBIPAY" }] }),
  component: AepsPage,
});

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

function AepsPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<ReturnType<typeof getSession>>(null);
  const [status, setStatus] = useState<AepsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const readiness = useServiceReadiness(!!session);
  const refresh = useCallback(async () => {
    const current = getSession();
    if (!current) return;
    setLoading(true);
    setError("");
    try {
      setStatus(await aepsApi.status(current.accessToken));
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const current = getSession();
    if (!current) {
      navigate({ to: "/login" });
      return;
    }
    setSession(current);
    void refresh();
  }, [navigate, refresh]);
  useEffect(() => {
    if (readiness.isSuccess && !readiness.data.aepsUnlocked) navigate({ to: "/dashboard" });
  }, [navigate, readiness.data, readiness.isSuccess]);
  if (!session) return null;
  return (
    <BusinessPage
      identity={session.identity}
      active="aeps"
      eyebrow="VimoPay"
      title="Aadhaar Enabled Payment System"
      description="Merchant onboarding and Aadhaar-enabled transactions become available after approved KYC and a verified bank account."
    >
      <div className="mb-5 flex justify-end">
        <button
          onClick={refresh}
          className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold"
        >
          <RefreshCw size={14} /> Refresh status
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
      {loading ? (
        <Loading />
      ) : (
        status && <AepsFlow token={session.accessToken} status={status} refresh={refresh} />
      )}
    </BusinessPage>
  );
}

function AepsFlow({
  token,
  status,
  refresh,
}: {
  token: string;
  status: AepsStatus;
  refresh: () => Promise<void>;
}) {
  switch (status.nextAction) {
    case "REGISTER":
    case "RETRY_REGISTRATION":
      return (
        <Registration
          token={token}
          retry={status.nextAction === "RETRY_REGISTRATION"}
          done={refresh}
        />
      );
    case "OTP":
      return <OnboardingOtp token={token} done={refresh} />;
    case "EKYC":
      return (
        <BiometricStep
          title="Merchant e-KYC"
          description="Capture a fresh fingerprint using your registered RD device."
          submit={(pidData) => aepsApi.ekyc(token, pidData)}
          done={refresh}
        />
      );
    case "TWO_FACTOR_AUTH":
      return <DailyTwoFactor token={token} done={refresh} />;
    case "AEPS_TRANSACTION":
      return <TransactionWorkspace token={token} />;
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

const emptyRegistration = {
  bankAccountId: "",
  kycProfileId: "",
  vimopayBankCode: "",
  lat: "",
  long: "",
  firstName: "",
  middleName: "",
  lastName: "",
  dob: "",
  emailId: "",
  merchantPhoneNumber: "",
  merchantAddress1: "",
  merchantAddress2: "",
  merchantState: "",
  merchantDistrict: "",
  gender: "M",
  merchantPinCode: "",
  merchantPan: "",
  aadhaarNumber: "",
  shopPan: "",
  shopAddress: "",
  shopDistrict: "",
  shopState: "",
  shopPincode: "",
  shopLat: "",
  shopLong: "",
};

function Registration({
  token,
  retry,
  done,
}: {
  token: string;
  retry: boolean;
  done: () => Promise<void>;
}) {
  const [form, setForm] = useState(emptyRegistration),
    [banks, setBanks] = useState<MasterItem[]>([]),
    [states, setStates] = useState<MasterItem[]>([]),
    [districts, setDistricts] = useState<MasterItem[]>([]),
    [shopDistricts, setShopDistricts] = useState<MasterItem[]>([]),
    [saved, setSaved] = useState<SavedBank[]>([]),
    [kyc, setKyc] = useState<KycProfile | null>(null),
    [prerequisiteErrors, setPrerequisiteErrors] = useState<string[]>([]),
    [loadingPrerequisites, setLoadingPrerequisites] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
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
      else issues.push(`VimoPay bank list: ${messageOf(bankResult.reason)}`);
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
  }, [token]);
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
  const set = (name: keyof typeof form, value: string) => setForm((f) => ({ ...f, [name]: value }));
  const locate = () =>
    navigator.geolocation?.getCurrentPosition(
      (p) =>
        setForm((f) => ({
          ...f,
          lat: String(p.coords.latitude),
          long: String(p.coords.longitude),
          shopLat: f.shopLat || String(p.coords.latitude),
          shopLong: f.shopLong || String(p.coords.longitude),
        })),
      () => setError("Location permission is required for AEPS registration."),
      { enableHighAccuracy: true },
    );
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await aepsApi.register(
        token,
        Object.fromEntries(Object.entries(form).filter(([, v]) => v !== "")),
      );
      await done();
    } catch (x) {
      setError(messageOf(x));
    } finally {
      setBusy(false);
    }
  }
  const fields: Array<[keyof typeof form, string, string?]> = [
    ["firstName", "First name"],
    ["middleName", "Middle name (optional)"],
    ["lastName", "Last name"],
    ["dob", "Date of birth", "DD-MM-YYYY"],
    ["emailId", "Email", "name@example.com"],
    ["merchantPhoneNumber", "Merchant mobile", "10 digits"],
    ["merchantAddress1", "Residence address line 1"],
    ["merchantAddress2", "Residence address line 2 (optional)"],
    ["merchantPinCode", "Residence PIN", "6 digits"],
    ["merchantPan", "Merchant PAN", "ABCDE1234F"],
    ["aadhaarNumber", "Merchant Aadhaar", "12 digits"],
    ["shopPan", "Shop PAN", "ABCDE1234F"],
    ["shopAddress", "Shop address"],
    ["shopPincode", "Shop PIN", "6 digits"],
  ];
  return (
    <Panel
      title={retry ? "Retry VimoPay registration" : "Merchant registration"}
      description="Use a verified bank account and approved KYC profile. Sensitive identity details stay only in this form until submission."
    >
      <form onSubmit={submit} className="space-y-6">
        {error && <Notice tone="error">{error}</Notice>}
        {loadingPrerequisites && (
          <Notice tone="info">
            Checking approved KYC, verified bank accounts, and VimoPay master data…
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
            options={saved.map((b) => ({
              value: b.id,
              label: `${b.bankName || "Bank account"} ••••${b.accountNumberLast4 || ""} (${b.accountType || ""})`,
            }))}
          />
          <SelectField
            label="VimoPay registration bank"
            value={form.vimopayBankCode}
            onChange={(v) => set("vimopayBankCode", v)}
            options={banks.map((b) => ({ value: b.code || "", label: b.description }))}
          />
          {fields.map(([name, label, placeholder]) => (
            <Field
              key={name}
              label={label}
              value={form[name]}
              placeholder={placeholder}
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
            options={[
              { value: "M", label: "Male" },
              { value: "F", label: "Female" },
              { value: "O", label: "Other" },
            ]}
          />
          <SelectField
            label="Residence state"
            value={form.merchantState}
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
            options={districts.map(masterOption)}
          />
          <SelectField
            label="Shop state"
            value={form.shopState}
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
            options={shopDistricts.map(masterOption)}
          />
          <Field label="Current latitude" value={form.lat} onChange={(v) => set("lat", v)} />
          <Field label="Current longitude" value={form.long} onChange={(v) => set("long", v)} />
          <Field label="Shop latitude" value={form.shopLat} onChange={(v) => set("shopLat", v)} />
          <Field
            label="Shop longitude"
            value={form.shopLong}
            onChange={(v) => set("shopLong", v)}
          />
        </div>
        <button
          type="button"
          onClick={locate}
          className="flex items-center gap-2 text-sm font-bold text-primary"
        >
          <MapPin size={16} /> Use current location
        </button>
        <Submit busy={busy || loadingPrerequisites || prerequisiteErrors.length > 0}>
          Submit registration
        </Submit>
      </form>
    </Panel>
  );
}

function OnboardingOtp({ token, done }: { token: string; done: () => Promise<void> }) {
  const [otp, setOtp] = useState(""),
    [sent, setSent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const send = async (resend = false) => {
    setBusy(true);
    setError("");
    try {
      await aepsApi.sendOtp(token, resend);
      setSent(true);
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
      <form onSubmit={verify} className="mt-5 max-w-md space-y-4">
        <Field
          label="OTP"
          value={otp}
          onChange={(v) => setOtp(digits(v))}
          placeholder="Enter provider OTP"
          required
        />
        {!sent ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => send()}
            className="w-full rounded-xl bg-secondary py-3 text-sm font-bold text-white"
          >
            Send OTP
          </button>
        ) : (
          <>
            <Submit busy={busy}>Verify OTP</Submit>
            <button
              type="button"
              disabled={busy}
              onClick={() => send(true)}
              className="w-full text-sm font-bold text-primary"
            >
              Resend OTP
            </button>
          </>
        )}
      </form>
    </Panel>
  );
}

function BiometricStep({
  title,
  description,
  submit,
  done,
}: {
  title: string;
  description: string;
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
      <Capture value={pid} onChange={setPid} />
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

function DailyTwoFactor({ token, done }: { token: string; done: () => Promise<void> }) {
  const [aadhaar, setAadhaar] = useState(""),
    [lat, setLat] = useState(""),
    [long, setLong] = useState(""),
    [pid, setPid] = useState(""),
    [deviceType, setDeviceType] = useState("mantra"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition((p) => {
      setLat(String(p.coords.latitude));
      setLong(String(p.coords.longitude));
    });
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await aepsApi.twoFactor(token, {
        aadhaarNumber: aadhaar,
        deviceType,
        pidData: pid,
        lat,
        long,
      });
      setAadhaar("");
      setPid("");
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
      description="VimoPay requires one fresh biometric 2FA per India calendar day."
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <Notice tone="error">{error}</Notice>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Merchant Aadhaar"
            value={aadhaar}
            onChange={(v) => setAadhaar(digits(v).slice(0, 12))}
            required
          />
          <Field label="RD device type" value={deviceType} onChange={setDeviceType} required />
          <Field label="Latitude" value={lat} onChange={setLat} required />
          <Field label="Longitude" value={long} onChange={setLong} required />
        </div>
        <Capture value={pid} onChange={setPid} />
        <Submit busy={busy || !pid}>Complete daily 2FA</Submit>
      </form>
    </Panel>
  );
}

const services: Array<{
  code: AepsTxnCode;
  title: string;
  icon: typeof Banknote;
  financial: boolean;
}> = [
  { code: "BE", title: "Balance Enquiry", icon: WalletCards, financial: false },
  { code: "MS", title: "Mini Statement", icon: ReceiptText, financial: false },
  { code: "CW", title: "Cash Withdrawal", icon: Banknote, financial: true },
  { code: "AP", title: "Aadhaar Pay", icon: BadgeIndianRupee, financial: true },
  { code: "CD", title: "Cash Deposit", icon: Landmark, financial: true },
];

function TransactionWorkspace({ token }: { token: string }) {
  const [operation, setOperation] = useState<AepsTxnCode | null>(null),
    [result, setResult] = useState<TransactionResult | null>(null);
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
        token={token}
        operation={operation}
        done={setResult}
        cancel={() => setOperation(null)}
      />
    );
  return (
    <Panel
      title="AEPS services"
      description="Choose a service. Every biometric capture must be fresh for the current transaction."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map(({ code, title, icon: Icon, financial }) => (
          <button
            key={code}
            onClick={() => setOperation(code)}
            className="group rounded-2xl border border-border bg-background p-5 text-left transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-soft"
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
  operation,
  done,
  cancel,
}: {
  token: string;
  operation: AepsTxnCode;
  done: (r: TransactionResult) => void;
  cancel: () => void;
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
    [otp, setOtp] = useState(""),
    [auth, setAuth] = useState<{ authRequestId: string; expiresAt: string } | null>(null),
    [intentKey, setIntentKey] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const highValue = (operation === "CW" || operation === "AP") && Number(form.amount) > 5000;
  useEffect(() => {
    aepsApi
      .bankIins(token, operation, authType)
      .then(setIins)
      .catch((e) => setError(messageOf(e)));
  }, [authType, operation, token]);
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition((p) =>
      setForm((f) => ({ ...f, lat: String(p.coords.latitude), long: String(p.coords.longitude) })),
    );
  }, []);
  const set = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setIntentKey("");
  };
  const requestOtp = async () => {
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
      setAuth(a);
      setForm((f) => ({ ...f, pidData: "" }));
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (highValue && !auth) {
      await requestOtp();
      return;
    }
    setBusy(true);
    setError("");
    try {
      const body = {
        ...form,
        ...(needsAmount ? {} : { amount: undefined }),
        ...(auth ? { authRequestId: auth.authRequestId } : {}),
      };
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
            onChange={(v) => setAuthType(v as AuthType)}
            options={[
              { value: "BA", label: "Fingerprint / biometric" },
              { value: "FA", label: "Face authentication" },
            ]}
          />
          <SelectField
            label="Customer bank"
            value={form.bankIIN}
            onChange={(v) => set("bankIIN", v)}
            options={iins.map((i) => ({ value: i.iin || "", label: i.description }))}
          />
          <Field
            label="RD device type"
            value={form.deviceType}
            onChange={(v) => set("deviceType", v)}
            required
          />
          <Field label="Latitude" value={form.lat} onChange={(v) => set("lat", v)} required />
          <Field label="Longitude" value={form.long} onChange={(v) => set("long", v)} required />
        </div>
        {highValue && !auth && (
          <Notice tone="info">
            Amounts above ₹5,000 require a provider OTP before biometric capture. Submit the details
            below to request it.
          </Notice>
        )}
        {auth && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-bold text-emerald-800">Transaction OTP sent</p>
            <p className="mt-1 text-xs text-emerald-700">
              Authorization expires {new Date(auth.expiresAt).toLocaleString()}. Enter the customer
              OTP below; it is sent only to the RD device capture request.
            </p>
            <div className="mt-3">
              <Field
                label="Provider OTP for RD capture"
                value={otp}
                onChange={(v) => setOtp(digits(v))}
                required
              />
            </div>
          </div>
        )}
        {(!highValue || auth) && (
          <Capture
            value={form.pidData}
            onChange={(v) => set("pidData", v)}
            otp={auth ? otp : undefined}
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
            disabled={busy || ((!highValue || !!auth) && !form.pidData)}
            className="flex-[2] rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {busy
              ? "Processing…"
              : highValue && !auth
                ? "Send transaction OTP"
                : `Confirm ${service.title}`}
          </button>
        </div>
      </form>
    </Panel>
  );
}

function Capture({
  value,
  onChange,
  otp,
}: {
  value: string;
  onChange: (v: string) => void;
  otp?: string;
}) {
  const [url, setUrl] = useState("http://127.0.0.1:11100/rd/capture"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const run = async () => {
    setBusy(true);
    setError("");
    try {
      onChange(await capturePid(url, otp));
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-mint text-secondary">
          <Fingerprint />
        </span>
        <div>
          <p className="text-sm font-extrabold text-secondary">Registered biometric device</p>
          <p className="text-xs text-muted-foreground">Capture a new PID for this request only.</p>
        </div>
        {value && <CheckCircle2 className="ml-auto text-emerald-600" />}
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          aria-label="RD service URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-border bg-card px-3 py-2 text-xs outline-none focus:border-primary"
        />
        <button
          type="button"
          disabled={busy || (!!otp === false && otp !== undefined)}
          onClick={run}
          className="rounded-xl bg-secondary px-5 py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          {busy ? "Capturing…" : value ? "Capture again" : "Capture fingerprint"}
        </button>
      </div>
      {otp !== undefined && !otp && (
        <p className="mt-2 text-xs text-amber-700">
          Enter the provider OTP before biometric capture.
        </p>
      )}
      {error && <p className="mt-2 text-xs font-semibold text-red-700">{error}</p>}
    </div>
  );
}

function Receipt({ result, again }: { result: TransactionResult; again: () => void }) {
  const detail = result.result || result;
  const success =
    String(detail.status || result.status || "").toUpperCase() === "000" ||
    String(result.status).toUpperCase() === "SUCCESS";
  return (
    <Panel
      title={success ? "Transaction successful" : "Transaction result"}
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
          ["Transaction type", result.transactionType],
          ["RRN", detail.rrn],
          ["NPCI code", detail.npciCode],
          ["Aadhaar", detail.aadhaarNo],
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
function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-muted-foreground">{label}</span>
      <input
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
      />
    </label>
  );
}
function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-muted-foreground">{label}</span>
      <select
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary"
      >
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
function Submit({ busy, children }: { busy: boolean; children: ReactNode }) {
  return (
    <button
      disabled={busy}
      className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
    >
      {busy ? "Please wait…" : children}
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
  return error instanceof ApiError || error instanceof Error
    ? error.message
    : "Something went wrong.";
}
function digits(value: string) {
  return value.replace(/\D/g, "");
}
function sensitive(name: keyof typeof emptyRegistration) {
  return ["merchantPhoneNumber", "merchantPinCode", "aadhaarNumber", "shopPincode"].includes(name);
}
function pan(name: keyof typeof emptyRegistration) {
  return name === "merchantPan" || name === "shopPan";
}
function masterOption(item: MasterItem) {
  return { value: item.code || "", label: item.description };
}
