import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import logo from "@/assets/logo.png";
import {
  adminAuthApi,
  adminRequiresDeviceVerification,
  getAdminSession,
  type AdminDeviceVerificationChallenge,
  type AdminLoginMethod,
  type AdminSession,
} from "@/lib/admin-api";
import { clearSession } from "@/lib/auth-api";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Admin sign in — UMOBIPAY" }] }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [loginWith, setLoginWith] = useState<AdminLoginMethod>("PASSWORD");
  const [credential, setCredential] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [challenge, setChallenge] = useState<AdminDeviceVerificationChallenge | null>(null);
  const [otp, setOtp] = useState("");

  useEffect(() => {
    if (getAdminSession()) void navigate({ to: "/admin" });
  }, [navigate]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (loginWith === "MPIN" && !/^\d{4}$/.test(credential)) {
        setError("Enter a valid 4 digit MPIN.");
        return;
      }
      const session = await adminAuthApi.login(identifier.trim(), loginWith, credential);
      if (adminRequiresDeviceVerification(session)) {
        setChallenge(session);
        setOtp("");
        return;
      }
      finishLogin(session);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign in failed.");
    } finally {
      setSubmitting(false);
    }
  }
  async function verifyDevice(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!challenge || !/^\d{6}$/.test(otp)) return setError("Enter the 6-digit verification code.");
    setSubmitting(true);
    try {
      const session = await adminAuthApi.verifyDeviceLogin(challenge.challengeId, otp);
      finishLogin(session);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Device verification failed.");
    } finally {
      setSubmitting(false);
    }
  }
  function finishLogin(session: AdminSession) {
    clearSession();
    if (session.onboardingRequired) {
      void navigate({ to: "/admin/onboarding" });
      return;
    }
    void navigate({ to: "/admin" });
  }

  return (
    <main className="grid min-h-screen bg-[#f1f7f5] lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden bg-secondary p-14 text-white lg:flex lg:flex-col">
        <div className="absolute -right-24 -top-20 h-96 w-96 rounded-full bg-primary/25 blur-3xl" />
        <img src={logo} alt="UMOBIPAY" className="relative h-11 w-fit brightness-0 invert" />
        <div className="relative my-auto max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[.16em]">
            <ShieldCheck size={16} /> Secure operations workspace
          </span>
          <h1 className="mt-7 text-5xl font-black leading-tight">
            Control every financial operation from one place.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-white/65">
            Review compliance, monitor bank verification and manage platform operations through a
            focused command center.
          </p>
        </div>
        <p className="relative text-xs text-white/40">
          Protected by the dedicated Super Admin authentication service
        </p>
      </section>
      <section className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <Link to="/" className="lg:hidden">
            <img src={logo} alt="UMOBIPAY" className="mb-10 h-10" />
          </Link>
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-white shadow-lg">
            <LockKeyhole />
          </span>
          <p className="mt-7 text-xs font-extrabold uppercase tracking-[.2em] text-primary">
            Administrator access
          </p>
          <h2 className="mt-2 text-3xl font-black text-secondary">
            {challenge ? "Verify this device" : "Welcome back"}
          </h2>
          {challenge ? (
            <>
              <p className="mt-2 text-sm text-muted-foreground">{challenge.message}</p>
              <p className="mt-2 text-sm font-bold text-secondary">
                Code sent to {challenge.maskedEmail}
              </p>
              <form onSubmit={verifyDevice} className="mt-8 space-y-5">
                <label className="block text-xs font-extrabold uppercase tracking-wide text-secondary">
                  6-digit verification code
                  <input
                    autoFocus
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3.5 text-center text-xl tracking-[.5em] outline-none focus:border-primary"
                  />
                </label>
                <p className="text-xs text-muted-foreground">
                  Expires {new Date(challenge.expiresAt).toLocaleString("en-IN")}
                </p>
                {error && (
                  <p
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700"
                  >
                    {error}
                  </p>
                )}
                <button
                  disabled={submitting || otp.length !== 6}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-sm font-extrabold text-white disabled:opacity-60"
                >
                  {submitting ? "Verifying..." : "Verify & Sign In"}
                  <ArrowRight size={17} />
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setChallenge(null);
                    setOtp("");
                    setError("");
                  }}
                  className="w-full rounded-xl border border-border py-3 text-sm font-bold"
                >
                  Back to login
                </button>
              </form>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                Sign in with your Super Admin login ID, username, email or phone number.
              </p>
              <form onSubmit={submit} className="mt-8 space-y-5">
                <div className="flex rounded-xl bg-secondary/5 p-1" aria-label="Sign-in method">
                  {(["PASSWORD", "MPIN"] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => {
                        setLoginWith(method);
                        setCredential("");
                        setError("");
                        setShow(false);
                      }}
                      className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition ${loginWith === method ? "bg-white text-secondary shadow-sm" : "text-muted-foreground hover:text-secondary"}`}
                    >
                      {method === "PASSWORD" ? "Password" : "MPIN"}
                    </button>
                  ))}
                </div>
                <label className="block text-xs font-extrabold uppercase tracking-wide text-secondary">
                  Login identifier
                  <input
                    autoComplete="username"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Login ID, username, email or phone"
                    className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3.5 text-sm outline-none focus:border-primary"
                  />
                </label>
                <label className="block text-xs font-extrabold uppercase tracking-wide text-secondary">
                  {loginWith === "PASSWORD" ? "Password" : "MPIN"}
                  <span className="relative mt-2 block">
                    <input
                      type={show ? "text" : "password"}
                      autoComplete={loginWith === "PASSWORD" ? "current-password" : "one-time-code"}
                      inputMode={loginWith === "MPIN" ? "numeric" : undefined}
                      maxLength={loginWith === "MPIN" ? 4 : undefined}
                      required
                      value={credential}
                      onChange={(e) =>
                        setCredential(
                          loginWith === "MPIN" ? e.target.value.replace(/\D/g, "") : e.target.value,
                        )
                      }
                      placeholder={
                        loginWith === "PASSWORD" ? "Enter your password" : "Enter 4 digit MPIN"
                      }
                      className="w-full rounded-xl border border-border bg-white px-4 py-3.5 pr-12 text-sm outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShow(!show)}
                      aria-label={
                        show ? `Hide ${loginWith.toLowerCase()}` : `Show ${loginWith.toLowerCase()}`
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {show ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </span>
                </label>
                {error && (
                  <p
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700"
                  >
                    {error}
                  </p>
                )}
                <button
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-sm font-extrabold text-white shadow-lg shadow-primary/20 disabled:opacity-60"
                >
                  {submitting
                    ? "Signing in..."
                    : `Continue with ${loginWith === "PASSWORD" ? "password" : "MPIN"}`}{" "}
                  <ArrowRight size={17} />
                </button>
              </form>
            </>
          )}
          <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">
            This portal uses the dedicated <b>/super-admin/auth</b> backend flow. Retailer
            credentials will not work here.
          </p>
        </div>
      </section>
    </main>
  );
}
