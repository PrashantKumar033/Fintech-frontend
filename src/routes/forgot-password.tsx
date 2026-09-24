import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { authApi, ApiError } from "@/lib/auth-api";
import logo from "@/assets/logo.png";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  User,
  MessageSquare,
  KeyRound,
} from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot Password — UMOBIPAY" }] }),
  component: ForgotPasswordPage,
});

type Step = 1 | 2 | 3 | 4;
const labels = ["Verify", "OTP", "New Password", "Done"];
const inputClass =
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-secondary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [draftId, setDraftId] = useState("");
  const [loginId, setLoginId] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [aadharLast4, setAadharLast4] = useState("");
  const [otp, setOtp] = useState("");
  const [shownOtp, setShownOtp] = useState("");
  const [otpMessage, setOtpMessage] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  async function run(fn: () => Promise<void>) {
    setError("");
    setLoading(true);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Kuch galat ho gaya, dobara try karo.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (step === 1) {
      run(async () => {
        const r = await authApi.forgotPasswordVerifyUser({
          loginId: loginId.trim(),
          panNumber: panNumber.trim().toUpperCase(),
          aadharLast4: aadharLast4.trim(),
        });
        setDraftId(r.draftId);
        setShownOtp(r.otp || "");
        setOtpMessage(r.message || "OTP sent successfully.");
        setStep(2);
      });
      return;
    }

    if (step === 2) {
      run(async () => {
        await authApi.forgotPasswordVerifyOtp(draftId, otp.trim());
        setStep(3);
      });
      return;
    }

    if (step === 3) {
      run(async () => {
        if (newPassword !== confirmPassword) {
          throw new ApiError("Password match nahi kar raha.", 0);
        }
        await authApi.forgotPasswordReset({ draftId, newPassword, confirmPassword });
        setStep(4);
      });
      return;
    }
  }

  function resendOtp() {
    void run(async () => {
      const r = await authApi.forgotPasswordVerifyUser({
        loginId: loginId.trim(),
        panNumber: panNumber.trim().toUpperCase(),
        aadharLast4: aadharLast4.trim(),
      });
      setDraftId(r.draftId);
      setOtp("");
      setShownOtp(r.otp || "");
      setOtpMessage(r.message || "A fresh OTP has been sent.");
    });
  }

  return (
    <div className="min-h-screen overflow-x-clip bg-background">
      <SiteNav />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-grid opacity-30" />
      <main className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-7xl items-center px-6 py-16">
        <div className="grid w-full gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          {/* ---------- LEFT SIDE ---------- */}
          <section className="hidden lg:block">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-accent">
              <ShieldCheck size={13} /> Account recovery
            </span>
            <h1 className="mt-6 font-display text-5xl font-extrabold leading-tight text-secondary">
              Reset your
              <br />
              <span className="text-gradient-warm">UMOBIPAY password</span>
            </h1>
            <p className="mt-5 max-w-sm text-foreground/70">
              Temporary password bhool gaye? Koi baat nahi — apni details verify karke naya password
              3 aasan steps mein set kar sakte ho.
            </p>
            <div className="mt-8 space-y-3">
              {[
                { icon: User, text: "Login ID, PAN aur Aadhaar se identity verify karo" },
                { icon: MessageSquare, text: "Registered phone number pe OTP verify karo" },
                { icon: KeyRound, text: "Apna naya password set karo" },
              ].map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-3.5 shadow-soft"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-mint">
                    <Icon size={16} />
                  </span>
                  <span className="text-sm font-medium text-secondary">{text}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ---------- RIGHT SIDE — same card jo pehle tha ---------- */}
          <section className="gradient-border rounded-[2rem] bg-card p-8 shadow-elegant sm:p-10">
            <img src={logo} alt="UMOBIPAY logo" className="h-10 w-auto" />

            {step < 4 && (
              <div className="mt-6 flex gap-1">
                {labels.slice(0, 3).map((l, i) => (
                  <div key={l} className="flex-1">
                    <div
                      className={`h-1.5 rounded-full ${i + 1 <= step ? "bg-primary" : "bg-muted"}`}
                    />
                    <p
                      className={`mt-1 text-xs font-semibold ${i + 1 === step ? "text-primary" : "text-muted-foreground"}`}
                    >
                      {l}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {step === 1 && (
                <>
                  <h2 className="text-xl font-extrabold text-secondary">Verify your identity</h2>
                  <p className="text-sm text-muted-foreground">
                    Login ID, PAN aur Aadhaar ke last 4 digit se identity confirm karo.
                  </p>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Login ID
                    </label>
                    <input
                      className={inputClass}
                      value={loginId}
                      onChange={(e) => setLoginId(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      PAN Number
                    </label>
                    <input
                      className={inputClass}
                      value={panNumber}
                      onChange={(e) => setPanNumber(e.target.value)}
                      maxLength={10}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Aadhaar — Last 4 digits
                    </label>
                    <input
                      className={inputClass}
                      value={aadharLast4}
                      onChange={(e) => setAadharLast4(e.target.value)}
                      maxLength={4}
                      required
                    />
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <h2 className="text-xl font-extrabold text-secondary">Enter OTP</h2>
                  <p className="text-sm text-muted-foreground">
                    Aapke registered phone number pe OTP bheja gaya hai.
                  </p>
                  <input
                    className={inputClass}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={6}
                    required
                  />
                  {shownOtp && (
                    <div className="rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary">
                      Development OTP: <strong>{shownOtp}</strong>
                    </div>
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
                    onClick={resendOtp}
                    className="w-full rounded-xl border border-primary px-4 py-3 text-sm font-semibold text-primary disabled:opacity-60"
                  >
                    {loading ? "Sending OTP..." : "Resend OTP"}
                  </button>
                </>
              )}

              {step === 3 && (
                <>
                  <h2 className="text-xl font-extrabold text-secondary">Set new password</h2>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        className={`${inputClass} pr-11`}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        minLength={8}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        aria-label="Toggle password visibility"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showNewPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        className={`${inputClass} pr-11`}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label="Toggle password visibility"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {step === 4 && (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <ShieldCheck className="text-primary" size={40} />
                  <h2 className="text-xl font-extrabold text-secondary">Password reset ho gaya!</h2>
                  <p className="text-sm text-muted-foreground">Ab naye password se login karo.</p>
                </div>
              )}

              {error && (
                <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                  {error}
                </div>
              )}

              {step < 4 ? (
                <div className="flex items-center gap-3 pt-2">
                  {step > 1 && (
                    <button
                      type="button"
                      onClick={() => setStep((step - 1) as Step)}
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border"
                    >
                      <ArrowLeft size={17} />
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <ArrowRight size={16} />
                    )}
                    Continue
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate({ to: "/login" })}
                  className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground"
                >
                  Go to Login
                </button>
              )}
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Yaad aa gaya password?{" "}
              <Link to="/login" className="font-semibold text-primary">
                Sign in
              </Link>
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
