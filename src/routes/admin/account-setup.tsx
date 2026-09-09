import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, BadgeCheck, Loader2, Phone, ShieldCheck } from "lucide-react";
import logo from "@/assets/logo.png";
import { authApi, clearSession, getSession, updateIdentityOnboarding } from "@/lib/auth-api";
import { isManagementRole, managementBasePath, normalizeRole } from "@/lib/role-hierarchy";

export const Route = createFileRoute("/admin/account-setup")({
  head: () => ({ meta: [{ title: "Verify admin identity — UMOBIPAY" }] }),
  component: AdminIdentitySetup,
});
const inputClass = "w-full rounded-xl border border-border bg-white px-4 py-3.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

export function AdminIdentitySetup() {
  const session = getSession();
  const role = normalizeRole(session?.identity.role);
  const isRetailer = role === "RETAILER";
  const managementBase = managementBasePath(role);
  const settingsPath = isRetailer ? "/retailer/settings" : `${managementBase}/settings`;
  const homePath = isRetailer ? "/retailer/dashboard" : managementBase;
  const [otpRequested, setOtpRequested] = useState(session?.nextStep === "VERIFY_PHONE_OTP");
  const [panOnly, setPanOnly] = useState(session?.nextStep === "ADD_PAN");
  const [phoneNumber, setPhoneNumber] = useState(session?.identity.phoneNumber || "");
  const [panNumber, setPanNumber] = useState(() => typeof window === "undefined" ? "" : sessionStorage.getItem("admin_setup_pan") || "");
  const [otp, setOtp] = useState("");
  const [developmentOtp, setDevelopmentOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const current = getSession();
    const currentRole = normalizeRole(current?.identity.role);
    if (!current || (!isManagementRole(currentRole) && currentRole !== "RETAILER")) return window.location.replace("/login");
    if (current.identity.passwordChangedAt && current.identity.mpinChangedAt) return window.location.replace(homePath);
    if (["CHANGE_PASSWORD", "CHANGE_MPIN"].includes(current.nextStep || "")) window.location.replace(settingsPath);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setMessage("");
    const phone = phoneNumber.replace(/\s/g, "");
    if (!otpRequested) {
      if (panOnly) {
        if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panNumber)) return setError("Enter a valid PAN in the format ABCDE1234F.");
      } else {
      if (!/^(?:\+91)?[6-9]\d{9}$/.test(phone)) return setError("Enter a valid Indian mobile number, for example +919876543210.");
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panNumber)) return setError("Enter a valid PAN in the format ABCDE1234F.");
      }
    } else if (!/^\d{6}$/.test(otp)) return setError("Enter the 6-digit OTP sent to your mobile number.");
    setLoading(true);
    try {
      if (panOnly) {
        const pan = await authApi.addIdentityOnboardingPan(panNumber);
        updateIdentityOnboarding("CHANGE_PASSWORD", pan.onboardingStatus);
        sessionStorage.removeItem("admin_setup_pan");
        window.location.replace(settingsPath);
      } else if (!otpRequested) {
        const result = await authApi.sendIdentityOnboardingPhoneOtp(phone);
        sessionStorage.setItem("admin_setup_pan", panNumber);
        setDevelopmentOtp(result.otp || ""); setMessage(result.message); setOtpRequested(true);
        updateIdentityOnboarding("VERIFY_PHONE_OTP", result.onboardingStatus);
      } else {
        const verified = await authApi.verifyIdentityOnboardingPhoneOtp(otp);
        updateIdentityOnboarding("ADD_PAN", verified.onboardingStatus);
        setPanOnly(true); setOtpRequested(false);
        const pan = await authApi.addIdentityOnboardingPan(panNumber);
        updateIdentityOnboarding("CHANGE_PASSWORD", pan.onboardingStatus);
        sessionStorage.removeItem("admin_setup_pan");
        window.location.replace(settingsPath);
      }
    } catch (caught) {
      const text = caught instanceof Error ? caught.message : "Identity verification could not be completed.";
      if (!otpRequested && !panOnly && /phone number has already been verified/i.test(text)) {
        setPanOnly(true);
        updateIdentityOnboarding("ADD_PAN", "PAN_PENDING");
        try {
          const pan = await authApi.addIdentityOnboardingPan(panNumber);
          updateIdentityOnboarding("CHANGE_PASSWORD", pan.onboardingStatus);
          sessionStorage.removeItem("admin_setup_pan");
          window.location.replace(settingsPath);
        } catch (panError) {
          const panText = panError instanceof Error ? panError.message : "PAN could not be added.";
          if (/PAN onboarding is not currently available/i.test(panText)) {
            updateIdentityOnboarding("CHANGE_PASSWORD", "CREDENTIAL_CHANGE_REQUIRED");
            window.location.replace(settingsPath);
          } else {
            setError(panText);
            setMessage("Your phone number is already verified. Correct or confirm PAN to continue.");
          }
        }
      } else {
        setError(text);
      }
    }
    finally { setLoading(false); }
  }

  return <main className="min-h-screen bg-[#f3f8f6] px-4 py-6 text-secondary sm:px-6 sm:py-10"><div className="mx-auto max-w-4xl">
    <header className="flex items-center justify-between"><img src={logo} alt="UMOBIPAY" className="h-10 w-auto" /><button type="button" onClick={() => { clearSession(); window.location.assign("/login"); }} className="text-xs font-bold text-muted-foreground">Sign out</button></header>
    <div className="mt-8 grid overflow-hidden rounded-[30px] border border-border bg-white shadow-xl shadow-secondary/5 lg:grid-cols-[.8fr_1.2fr]">
      <aside className="bg-[#00645c] p-8 text-white sm:p-10"><span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[.18em] text-emerald-200">First login verification</span><h1 className="mt-5 text-3xl font-black leading-tight">Verify your admin identity</h1><p className="mt-3 text-sm leading-6 text-white/65">Phone number, PAN and OTP are handled together on this single verification page. After completion, security setup continues in Admin Settings.</p><div className="mt-8 flex items-center gap-3 rounded-2xl bg-white/10 p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-300 text-secondary"><BadgeCheck size={20} /></span><div><p className="text-sm font-extrabold">Identity verification</p><p className="mt-0.5 text-xs text-white/55">One required setup stage</p></div></div></aside>
      <section className="p-8 sm:p-10"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">{otpRequested ? <ShieldCheck size={21} /> : <Phone size={21} />}</span><div><p className="text-xs font-extrabold uppercase tracking-wider text-primary">Identity verification</p><h2 className="text-2xl font-black">{otpRequested ? "Enter mobile OTP" : "Phone number and PAN"}</h2></div></div>
        <form onSubmit={submit} className="mt-7 space-y-4">{panOnly ? <><p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Phone OTP is verified. Correct or confirm PAN to continue.</p><Field label="PAN number"><input autoFocus value={panNumber} onChange={(e) => setPanNumber(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))} placeholder="ABCDE1234F" className={`${inputClass} uppercase`} /></Field></> : !otpRequested ? <><Field label="Mobile number"><input autoFocus value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+919876543210" inputMode="tel" autoComplete="tel" className={inputClass} /></Field><Field label="PAN number"><input value={panNumber} onChange={(e) => setPanNumber(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))} placeholder="ABCDE1234F" className={`${inputClass} uppercase`} /></Field></> : <>{developmentOtp && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"><p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700">Development OTP</p><p className="mt-1 text-2xl font-black tracking-[.3em] text-amber-900">{developmentOtp}</p></div>}<Field label="6-digit OTP"><input autoFocus value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" inputMode="numeric" autoComplete="one-time-code" className={`${inputClass} text-center text-xl tracking-[.35em]`} /></Field><div className="rounded-xl bg-muted px-4 py-3 text-xs text-muted-foreground">Phone: <strong>{phoneNumber}</strong><br />PAN: <strong>{panNumber || "Entered PAN"}</strong></div></>}
          {message && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</p>}{error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}<button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-extrabold text-white disabled:opacity-60">{loading ? <Loader2 className="animate-spin" size={17} /> : <>{panOnly ? "Save PAN & open Settings" : otpRequested ? "Verify & open Settings" : "Send OTP"}<ArrowRight size={17} /></>}</button></form>
      </section>
    </div>
  </div></main>;
}
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block"><span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-muted-foreground">{label}</span>{children}</label>; }
