import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Shield, Smartphone } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import {
  authApi,
  requiresDeviceVerification,
  saveSession,
  syncMyPermissions,
  type DeviceVerificationChallenge,
  type LoginMethod,
  type Session,
} from "@/lib/auth-api";
import { signedInHome } from "@/lib/role-hierarchy";
import { clearAdminSession } from "@/lib/admin-api";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login — UMOBIPAY" }] }),
  component: LoginPage,
});
const inputClass =
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-secondary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loginWith, setLoginWith] = useState<LoginMethod>("PASSWORD");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [challenge, setChallenge] = useState<DeviceVerificationChallenge | null>(null);
  const [otp, setOtp] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!identifier.trim() || !password.trim())
      return setError("Please complete all required fields.");
    setLoading(true);
    try {
      const result = await authApi.login({ identifier: identifier.trim(), loginWith, password });
      if (requiresDeviceVerification(result)) {
        setChallenge(result);
        setOtp("");
        return;
      }
      await completeLogin(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }
  async function verifyDevice(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!challenge || !/^\d{6}$/.test(otp)) return setError("Enter the 6-digit verification code.");
    setLoading(true);
    try {
      const result = await authApi.verifyDeviceLogin(challenge.challengeId, otp);
      await completeLogin(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Device verification failed.");
    } finally {
      setLoading(false);
    }
  }
  async function resendDeviceOtp() {
    setError("");
    setLoading(true);
    try {
      const result = await authApi.login({ identifier: identifier.trim(), loginWith, password });
      if (!requiresDeviceVerification(result)) {
        await completeLogin(result);
        return;
      }
      setChallenge(result);
      setOtp("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to resend verification code.");
    } finally {
      setLoading(false);
    }
  }
  async function completeLogin(result: Session) {
    clearAdminSession();
    saveSession(result.accessToken, result.identity);
    try {
      await syncMyPermissions(result.accessToken);
    } catch (permissionError) {
      // Login should not be blocked if authorization metadata is temporarily unavailable.
      // Protected backend routes remain the final authority and Settings can refresh access later.
      console.warn("Unable to pre-load effective permissions after login.", permissionError);
    }
    window.location.assign(signedInHome(result));
  }
  return (
    <div className="min-h-screen overflow-x-clip bg-background">
      <SiteNav />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-grid opacity-30" />
      <main className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-7xl items-center px-6 py-16">
        <div className="grid w-full gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <section className="hidden lg:block">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-accent">
              <Shield size={13} /> Secure login
            </span>
            <h1 className="mt-6 font-display text-5xl font-extrabold leading-tight text-secondary">
              Welcome back to
              <br />
              <span className="text-gradient-warm">UMOBIPAY</span>
            </h1>
            <p className="mt-5 max-w-sm text-foreground/70">
              Sign in securely using your login ID, username, email address, or phone number.
            </p>
            <div className="mt-8 space-y-3">
              {[
                { icon: Smartphone, text: "Multiple login identifiers" },
                { icon: Lock, text: "Password and MPIN support" },
                { icon: ArrowRight, text: "Secure refresh-token session" },
              ].map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-3.5 shadow-soft"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-mint">
                    <Icon size={16} />
                  </span>
                  <span className="text-sm font-medium text-secondary">{text}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="gradient-border rounded-[2rem] bg-card p-8 shadow-elegant sm:p-10">
            <Link to="/">
              <img src={logo} alt="UMOBIPAY" className="mb-6 h-10 w-auto" />
            </Link>
            <h2 className="font-display text-2xl font-extrabold text-secondary">
              {challenge ? "Verify this device" : "Sign in to your account"}
            </h2>
            {challenge ? (
              <>
                <p className="mt-2 text-sm text-foreground/60">{challenge.message}</p>
                <p className="mt-2 text-sm font-semibold text-secondary">
                  Code sent to {challenge.maskedEmail}
                </p>
                <form onSubmit={verifyDevice} className="mt-6 space-y-4">
                  <Field label="6-digit verification code">
                    <input
                      autoFocus
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                      className={`${inputClass} text-center text-xl tracking-[.5em]`}
                    />
                  </Field>
                  <p className="text-xs text-muted-foreground">
                    Expires {new Date(challenge.expiresAt).toLocaleString("en-IN")}
                  </p>
                  {error && (
                    <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </p>
                  )}
                  <button
                    disabled={loading || otp.length !== 6}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-3.5 text-sm font-semibold text-secondary-foreground disabled:opacity-60"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" size={17} />
                    ) : (
                      <>
                        Verify &amp; Sign In <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                  <div className="mt-4 flex gap-3">
                    <button
                    type="button"
                    disabled={loading}
                    onClick={() => void resendDeviceOtp()}
                    className="w-full rounded-xl border border-primary py-3 text-sm font-semibold text-primary disabled:opacity-60"
                  >
                    {loading ? "Sending code..." : "Resend verification code"}
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setChallenge(null);
                      setOtp("");
                      setError("");
                    }}
                    className="w-full rounded-xl border border-border py-3 text-sm font-semibold"
                  >
                    Back to login
                  </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <p className="mt-1 text-sm text-foreground/60">
                  New user?{" "}
                  <Link to="/register" className="font-semibold text-primary hover:underline">
                    Register here
                  </Link>
                </p>
                <div className="mt-6 flex rounded-xl border border-border bg-muted p-1">
                  {(["PASSWORD", "MPIN"] as const).map((method) => (
                    <button
                      type="button"
                      key={method}
                      onClick={() => {
                        setLoginWith(method);
                        setPassword("");
                      }}
                      className={`flex-1 rounded-lg py-2 text-sm font-semibold ${loginWith === method ? "bg-card text-secondary shadow-sm" : "text-muted-foreground"}`}
                    >
                      {method === "PASSWORD" ? "Password" : "MPIN"}
                    </button>
                  ))}
                </div>
                <form onSubmit={submit} className="mt-6 space-y-4">
                  <Field label="Login ID / Username / Email / Phone">
                    <input
                      autoComplete="username"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="Enter your identifier"
                      className={inputClass}
                    />
                  </Field>
                  <Field
                    label={loginWith === "PASSWORD" ? "Password" : "MPIN"}
                    action={
                      loginWith === "PASSWORD" ? (
                        <Link
                          to="/forgot-password"
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          Forgot Password?
                        </Link>
                      ) : undefined
                    }
                  >
                    <div className="relative">
                      <input
                        autoComplete="current-password"
                        type={show ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        maxLength={loginWith === "MPIN" ? 6 : undefined}
                        inputMode={loginWith === "MPIN" ? "numeric" : undefined}
                        placeholder={loginWith === "PASSWORD" ? "Enter password" : "Enter MPIN"}
                        className={`${inputClass} pr-11`}
                      />
                      <button
                        type="button"
                        onClick={() => setShow(!show)}
                        aria-label="Toggle visibility"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {show ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </Field>
                  {error && (
                    <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </p>
                  )}
                  <button
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-3.5 text-sm font-semibold text-secondary-foreground disabled:opacity-60"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" size={17} />
                    ) : (
                      <>
                        Sign In <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Field({
  label,
  action,
  children,
}: {
  label: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        {action}
      </span>
      {children}
    </label>
  );
}
