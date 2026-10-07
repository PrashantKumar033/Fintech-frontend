import { useState, type FormEvent } from "react";
import { MailCheck, PhoneCall, ShieldCheck } from "lucide-react";
import { ApiError, authApi, type Identity } from "@/lib/auth-api";

type Channel = "phone" | "email";

export function ContactVerificationCenter({ identity }: { identity: Identity }) {
  const [channel, setChannel] = useState<Channel>("phone");
  const [destination, setDestination] = useState(identity.phoneNumber || "");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function switchChannel(next: Channel) {
    setChannel(next);
    setDestination(next === "phone" ? identity.phoneNumber || "" : identity.email || "");
    setOtp("");
    setSent(false);
    setMessage(null);
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const result = channel === "phone"
        ? await authApi.sendPhoneOtp(destination.trim())
        : await authApi.sendEmailOtp(destination.trim());
      setSent(true);
      setMessage({
        ok: true,
        text: result.otp ? `${result.message} Development OTP: ${result.otp}` : result.message,
      });
    } catch (error) {
      setMessage({ ok: false, text: error instanceof ApiError ? error.message : "Unable to send OTP." });
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setMessage(null);
    try {
      const result = channel === "phone"
        ? await authApi.verifyPhoneOtp(destination.trim(), otp)
        : await authApi.verifyEmailOtp(destination.trim(), otp);
      setMessage({ ok: true, text: result.message || `${channel === "phone" ? "Phone" : "Email"} verified successfully.` });
      setOtp("");
      setSent(false);
    } catch (error) {
      setMessage({ ok: false, text: error instanceof ApiError ? error.message : "Unable to verify OTP." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-7">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><ShieldCheck size={20} /></span>
        <div><h2 className="text-xl font-extrabold text-secondary">Contact OTP verification</h2><p className="mt-1 text-sm text-muted-foreground">Send and verify a fresh OTP for the registered phone number or email address.</p></div>
      </div>
      <div className="mt-5 flex rounded-xl bg-muted p-1">
        {(["phone", "email"] as const).map((item) => <button key={item} type="button" onClick={() => switchChannel(item)} className={`flex-1 rounded-lg py-2 text-sm font-bold capitalize ${channel === item ? "bg-white text-secondary shadow-sm" : "text-muted-foreground"}`}>{item}</button>)}
      </div>
      <form onSubmit={send} className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
        <label><span className="mb-1.5 block text-xs font-extrabold uppercase text-muted-foreground">{channel === "phone" ? "Phone number" : "Email address"}</span><div className="flex items-center gap-2 rounded-xl border border-border bg-white px-4"><span className="text-muted-foreground">{channel === "phone" ? <PhoneCall size={16} /> : <MailCheck size={16} />}</span><input required type={channel === "phone" ? "tel" : "email"} value={destination} onChange={(event) => setDestination(event.target.value)} className="min-w-0 flex-1 py-3 text-sm outline-none" /></div></label>
        <button disabled={busy} className="self-end rounded-xl bg-primary px-5 py-3 text-sm font-extrabold text-white disabled:opacity-60">{busy ? "Sending…" : sent ? "Resend OTP" : "Send OTP"}</button>
      </form>
      {sent && <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]"><input aria-label="OTP" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="Enter 6-digit OTP" className="rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none focus:border-primary" /><button type="button" disabled={busy || otp.length !== 6} onClick={() => void verify()} className="rounded-xl border border-primary px-5 py-3 text-sm font-extrabold text-primary disabled:opacity-40">Verify OTP</button></div>}
      {message && <p role="status" className={`mt-4 rounded-xl p-3 text-sm font-semibold ${message.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{message.text}</p>}
    </section>
  );
}
