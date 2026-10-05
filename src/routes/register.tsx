import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Copy,
  Loader2,
  Rocket,
  ShieldCheck,
} from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { authApi, type RegistrationDetails, type RegistrationResult } from "@/lib/auth-api";
import { INDIAN_STATES } from "@/lib/indian-states";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Register — UMOBIPAY" }] }),
  component: RegisterPage,
});
type Step = 1 | 2 | 3 | 4 | 5;
const labels = ["Role", "Phone", "OTP", "PAN", "Details"];
const inputClass =
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-secondary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";
const initialDetails = {
  fullName: "",
  aadhaarNumber: "",
  username: "",
  email: "",
  shopName: "",
  shopAddress: "",
  shopCity: "",
  shopState: "",
  city: "",
  state: "",
  pincode: "",
};

function RegisterPage() {
  const [step, setStep] = useState<Step>(1);
  const [draftId, setDraftId] = useState("");
  const [role, setRole] = useState<"RETAILER" | "DISTRIBUTOR">("RETAILER");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [shownOtp, setShownOtp] = useState("");
  const [otpMessage, setOtpMessage] = useState("");
  const [pan, setPan] = useState("");
  const [details, setDetails] = useState(initialDetails);
  const [result, setResult] = useState<RegistrationResult>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const run = async (action: () => Promise<void>) => {
    setError("");
    setLoading(true);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await run(async () => {
      if (step === 1) {
        const r = await authApi.registerRole(role);
        setDraftId(r.draftId);
        setStep(2);
        return;
      }
      if (step === 2) {
        const normalized = phone.replace(/\s/g, "");
        if (!/^(\+91)?[6-9]\d{9}$/.test(normalized))
          throw new Error("Enter a valid Indian mobile number.");
        const r = await authApi.registerPhone(draftId, normalized);
        setPhone(normalized);
        setShownOtp(r.otp || "");
        setOtpMessage(r.message || "OTP sent successfully.");
        setStep(3);
        return;
      }
      if (step === 3) {
        if (!/^\d{4,6}$/.test(otp)) throw new Error("Enter a valid OTP.");
        await authApi.verifyRegistrationOtp(draftId, phone, otp);
        setStep(4);
        return;
      }
      if (step === 4) {
        const value = pan.trim().toUpperCase();
        if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value))
          throw new Error("Enter a valid PAN, for example ABCDE1234F.");
        await authApi.registerPan(draftId, value);
        setPan(value);
        setStep(5);
        return;
      }
      const required = Object.values(details).every((v) => v.trim());
      if (!required) throw new Error("Please complete all required fields.");
      if (!/^\d{12}$/.test(details.aadhaarNumber))
        throw new Error("The Aadhaar number must contain exactly 12 digits.");
      if (!/^\d{6}$/.test(details.pincode))
        throw new Error("The PIN code must contain exactly 6 digits.");
      const r = await authApi.registerDetails({ ...details, draftId });
      setResult(r);
    });
  };
  const resendOtp = () =>
    run(async () => {
      const r = await authApi.registerPhone(draftId, phone);
      setOtp("");
      setShownOtp(r.otp || "");
      setOtpMessage(r.message || "A fresh OTP has been sent.");
    });
  if (result)
    return (
      <Shell>
        <div className="mx-auto max-w-lg rounded-[2rem] border border-border bg-card p-8 text-center shadow-elegant sm:p-10">
          <CheckCircle2 className="mx-auto text-accent" size={56} />
          <h1 className="mt-4 text-3xl font-extrabold text-secondary">Registration complete!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Store these credentials securely now. They will not be displayed again.
          </p>
          <div className="mt-6 space-y-3 text-left">
            <Credential label="Login ID" value={result.loginId} />
            <Credential label="Temporary password" value={result.temporaryPassword} />
            <Credential label="Temporary MPIN" value={result.temporaryMpin} />
          </div>
          <Link
            to="/login"
            className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-3.5 text-sm font-semibold text-secondary-foreground"
          >
            Continue to Login <ArrowRight size={16} />
          </Link>
        </div>
      </Shell>
    );
  return (
    <Shell>
      <div className="grid w-full max-w-6xl gap-10 lg:grid-cols-[.75fr_1.25fr] lg:items-start">
        <aside className="hidden lg:block">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
            <Rocket size={13} /> Backend-connected onboarding
          </span>
          <h1 className="mt-6 text-5xl font-extrabold leading-tight text-secondary">
            Start with
            <br />
            <span className="text-gradient-brand">UMOBIPAY</span>
          </h1>
          <p className="mt-5 text-foreground/70">
            Each step is securely verified and saved. Please keep this page open until your
            registration is complete.
          </p>
        </aside>
        <section className="gradient-border rounded-[2rem] bg-card p-7 shadow-elegant sm:p-10">
          <Link to="/">
            <img src={logo} alt="UMOBIPAY" className="mb-6 h-10 w-auto" />
          </Link>
          <div className="mb-7 flex gap-1.5">
            {labels.map((label, i) => (
              <div key={label} className="min-w-0 flex-1">
                <div
                  className={`h-1.5 rounded-full ${i + 1 <= step ? "bg-primary" : "bg-muted"}`}
                />
                <span
                  className={`mt-1 hidden text-[10px] sm:block ${i + 1 === step ? "font-bold text-primary" : "text-muted-foreground"}`}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
          <h2 className="text-2xl font-extrabold text-secondary">
            {labels[step - 1]} verification
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Step {step} of 5</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            {step === 1 && <RoleStep role={role} setRole={setRole} />}{" "}
            {step === 2 && (
              <Field label="Indian mobile number">
                <input
                  autoFocus
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className={inputClass}
                />
              </Field>
            )}{" "}
            {step === 3 && (
              <>
                <Field label="OTP">
                  <input
                    autoFocus
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter OTP"
                    className={`${inputClass} text-center text-xl tracking-[.4em]`}
                  />
                </Field>
                {shownOtp && (
                  <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Development OTP: <strong>{shownOtp}</strong>
                  </p>
                )}
                {otpMessage ? (
                  <p
                    role="status"
                    className="text-center text-xs font-medium text-muted-foreground"
                  >
                    {otpMessage}
                  </p>
                ) : null}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void resendOtp()}
                  className="w-full rounded-xl border border-primary px-4 py-3 text-sm font-semibold text-primary disabled:opacity-60"
                >
                  {loading ? "Sending OTP..." : "Resend OTP"}
                </button>
              </>
            )}{" "}
            {step === 4 && (
              <Field label="PAN number">
                <input
                  autoFocus
                  maxLength={10}
                  value={pan}
                  onChange={(e) => setPan(e.target.value.toUpperCase())}
                  placeholder="ABCDE1234F"
                  className={`${inputClass} uppercase`}
                />
              </Field>
            )}{" "}
            {step === 5 && <DetailsStep values={details} setValues={setDetails} />}{" "}
            {error && (
              <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}
            <div className="flex gap-3">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((step - 1) as Step)}
                  className="rounded-xl border border-border px-4 text-secondary"
                >
                  <ArrowLeft size={17} />
                </button>
              )}
              <button
                disabled={loading}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={17} />
                ) : (
                  <>
                    {step === 5 ? "Complete Registration" : "Continue"}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </form>
          <p className="mt-5 text-center text-sm text-muted-foreground">
            Already registered?{" "}
            <Link to="/login" className="font-semibold text-primary">
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </Shell>
  );
}
function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-7xl items-center justify-center px-6 py-16">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
function RoleStep({
  role,
  setRole,
}: {
  role: "RETAILER" | "DISTRIBUTOR";
  setRole: (v: "RETAILER" | "DISTRIBUTOR") => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {(["RETAILER", "DISTRIBUTOR"] as const).map((v) => (
        <button
          type="button"
          key={v}
          onClick={() => setRole(v)}
          className={`rounded-2xl border p-5 text-left ${role === v ? "border-primary bg-primary/5 ring-2 ring-primary/10" : "border-border"}`}
        >
          <ShieldCheck className={role === v ? "text-primary" : "text-muted-foreground"} />
          <strong className="mt-3 block text-secondary">
            {v === "RETAILER" ? "Retailer" : "Distributor"}
          </strong>
          <span className="text-xs text-muted-foreground">
            {v === "RETAILER"
              ? "Customer services and daily transactions"
              : "Manage your retailer network"}
          </span>
        </button>
      ))}
    </div>
  );
}
function DetailsStep({
  values,
  setValues,
}: {
  values: typeof initialDetails;
  setValues: (v: typeof initialDetails) => void;
}) {
  const update = (key: keyof typeof values, value: string) =>
    setValues({ ...values, [key]: value });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Full name">
        <input
          value={values.fullName}
          onChange={(e) => update("fullName", e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Username">
        <input
          value={values.username}
          onChange={(e) => update("username", e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Email">
        <input
          type="email"
          value={values.email}
          onChange={(e) => update("email", e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Aadhaar number">
        <input
          inputMode="numeric"
          maxLength={12}
          value={values.aadhaarNumber}
          onChange={(e) => update("aadhaarNumber", e.target.value.replace(/\D/g, ""))}
          className={inputClass}
        />
      </Field>
      <Field label="Shop name">
        <input
          value={values.shopName}
          onChange={(e) => update("shopName", e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Shop address">
        <input
          value={values.shopAddress}
          onChange={(e) => update("shopAddress", e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Shop city">
        <input
          value={values.shopCity}
          onChange={(e) => update("shopCity", e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Shop state">
        <select
          value={values.shopState}
          onChange={(e) => update("shopState", e.target.value)}
          className={inputClass}
        >
          <option value="">Select state</option>
          {INDIAN_STATES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>
      <Field label="Residential city">
        <input
          value={values.city}
          onChange={(e) => update("city", e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Residential state">
        <select
          value={values.state}
          onChange={(e) => update("state", e.target.value)}
          className={inputClass}
        >
          <option value="">Select state</option>
          {INDIAN_STATES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>
      <Field label="Pincode">
        <input
          inputMode="numeric"
          maxLength={6}
          value={values.pincode}
          onChange={(e) => update("pincode", e.target.value.replace(/\D/g, ""))}
          className={inputClass}
        />
      </Field>
    </div>
  );
}
function Credential({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-muted p-4">
      <div>
        <span className="block text-xs uppercase text-muted-foreground">{label}</span>
        <strong className="text-secondary">{value}</strong>
      </div>
      <button
        type="button"
        onClick={() => navigator.clipboard.writeText(value)}
        aria-label={`Copy ${label}`}
        className="text-primary"
      >
        <Copy size={17} />
      </button>
    </div>
  );
}
