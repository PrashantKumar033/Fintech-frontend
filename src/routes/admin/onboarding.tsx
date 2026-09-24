import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import logo from "@/assets/logo.png";
import { adminAuthApi, getAdminSession, updateAdminOnboarding } from "@/lib/admin-api";

export const Route = createFileRoute("/admin/onboarding")({ component: SuperAdminOnboarding });
const steps = [
  "ADD_PHONE",
  "VERIFY_PHONE_OTP",
  "ADD_PAN",
  "CHANGE_PASSWORD",
  "CHANGE_MPIN",
] as const;

function SuperAdminOnboarding() {
  const navigate = useNavigate();
  const initial = getAdminSession();
  const [step, setStep] = useState(initial?.nextStep || "ADD_PHONE");
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [onboardingPhone, setOnboardingPhone] = useState(() =>
    typeof window === "undefined"
      ? ""
      : sessionStorage.getItem("super_admin_onboarding_phone") || "",
  );
  useEffect(() => {
    if (!getAdminSession()) void navigate({ to: "/admin/login" });
    else if (!getAdminSession()?.onboardingRequired) void navigate({ to: "/admin" });
  }, [navigate]);
  const set = (key: string, value: string) =>
    setValues((current) => ({ ...current, [key]: value }));
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      let result: { message: string; nextStep: string | null; onboardingStatus?: string };
      if (step === "ADD_PHONE") {
        result = await adminAuthApi.sendOnboardingPhoneOtp(values.phoneNumber);
        setOnboardingPhone(values.phoneNumber);
        sessionStorage.setItem("super_admin_onboarding_phone", values.phoneNumber);
      } else if (step === "VERIFY_PHONE_OTP") {
        result = await adminAuthApi.verifyOnboardingPhoneOtp(values.otp);
        sessionStorage.removeItem("super_admin_onboarding_phone");
      } else if (step === "ADD_PAN") result = await adminAuthApi.addOnboardingPan(values.panNumber);
      else if (step === "CHANGE_PASSWORD") {
        if (values.newPassword !== values.confirmPassword)
          throw new Error("New passwords do not match.");
        result = await adminAuthApi.changeOnboardingPassword(
          values.currentPassword,
          values.newPassword,
        );
      } else {
        if (values.newMpin !== values.confirmMpin) throw new Error("New MPINs do not match.");
        result = await adminAuthApi.changeOnboardingMpin(values.currentMpin, values.newMpin);
      }
      updateAdminOnboarding(result.nextStep, result.onboardingStatus);
      setMessage(result.message);
      setValues({});
      if (!result.nextStep) setTimeout(() => void navigate({ to: "/admin" }), 700);
      else setStep(result.nextStep);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Onboarding step failed.");
    } finally {
      setLoading(false);
    }
  }
  async function resendOtp() {
    if (!onboardingPhone || loading) {
      setError("Return to the phone step and enter the registered phone number again.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const result = await adminAuthApi.sendOnboardingPhoneOtp(onboardingPhone);
      set("otp", "");
      setMessage(result.message || "A fresh OTP has been sent.");
      updateAdminOnboarding(result.nextStep, result.onboardingStatus);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to resend OTP.");
    } finally {
      setLoading(false);
    }
  }
  const position = Math.max(0, steps.indexOf(step as (typeof steps)[number]));
  return (
    <main className="min-h-screen bg-[#f3f8f6] p-5 sm:p-10">
      <div className="mx-auto max-w-2xl">
        <img src={logo} alt="UMOBIPAY" className="h-10" />
        <div className="mt-8 rounded-[28px] border border-border bg-white p-6 shadow-xl sm:p-10">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-white">
            <LockKeyhole />
          </span>
          <p className="mt-6 text-xs font-extrabold uppercase tracking-[.18em] text-primary">
            Secure Super Admin setup
          </p>
          <h1 className="mt-2 text-3xl font-black">Complete account onboarding</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Temporary credentials cannot access protected administration APIs until all security
            steps are completed.
          </p>
          <div className="mt-7 flex gap-2">
            {steps.map((item, index) => (
              <div
                key={item}
                className={`h-2 flex-1 rounded-full ${index <= position ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
          <form onSubmit={submit} className="mt-8 space-y-5">
            <StepFields step={step} values={values} set={set} />
            {step === "VERIFY_PHONE_OTP" ? (
              <button
                type="button"
                disabled={loading}
                onClick={() => void resendOtp()}
                className="w-full rounded-xl border border-primary px-4 py-3 text-sm font-extrabold text-primary disabled:opacity-60"
              >
                {loading ? "Sending OTP..." : "Resend OTP"}
              </button>
            ) : null}
            {error && (
              <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>
            )}
            {message && (
              <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
                <CheckCircle2 size={17} />
                {message}
              </p>
            )}
            <button
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-extrabold text-white disabled:opacity-60"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}{" "}
              Continue securely <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
const input =
  "mt-2 w-full rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-primary";
function Field({
  label,
  type = "text",
  value,
  onChange,
  maxLength,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}) {
  return (
    <label className="block text-xs font-extrabold uppercase tracking-wide">
      {label}
      <input
        required
        type={type}
        value={value || ""}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className={input}
      />
    </label>
  );
}
function StepFields({
  step,
  values,
  set,
}: {
  step: string;
  values: Record<string, string>;
  set: (key: string, value: string) => void;
}) {
  if (step === "ADD_PHONE")
    return (
      <Field
        label="Indian phone number"
        value={values.phoneNumber}
        onChange={(v) => set("phoneNumber", v)}
      />
    );
  if (step === "VERIFY_PHONE_OTP")
    return (
      <Field
        label="6-digit phone OTP"
        value={values.otp}
        maxLength={6}
        onChange={(v) => set("otp", v.replace(/\D/g, ""))}
      />
    );
  if (step === "ADD_PAN")
    return (
      <Field
        label="PAN number"
        value={values.panNumber}
        maxLength={10}
        onChange={(v) => set("panNumber", v.toUpperCase())}
      />
    );
  if (step === "CHANGE_PASSWORD")
    return (
      <>
        <Field
          label="Temporary password"
          type="password"
          value={values.currentPassword}
          onChange={(v) => set("currentPassword", v)}
        />
        <Field
          label="New password"
          type="password"
          value={values.newPassword}
          onChange={(v) => set("newPassword", v)}
        />
        <Field
          label="Confirm new password"
          type="password"
          value={values.confirmPassword}
          onChange={(v) => set("confirmPassword", v)}
        />
      </>
    );
  return (
    <>
      <Field
        label="Temporary MPIN"
        type="password"
        value={values.currentMpin}
        maxLength={4}
        onChange={(v) => set("currentMpin", v.replace(/\D/g, ""))}
      />
      <Field
        label="New 4-digit MPIN"
        type="password"
        value={values.newMpin}
        maxLength={4}
        onChange={(v) => set("newMpin", v.replace(/\D/g, ""))}
      />
      <Field
        label="Confirm new MPIN"
        type="password"
        value={values.confirmMpin}
        maxLength={4}
        onChange={(v) => set("confirmMpin", v.replace(/\D/g, ""))}
      />
    </>
  );
}
