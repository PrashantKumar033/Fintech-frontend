import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Eye, EyeOff, KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import { AdminLayout, AdminPanel, ServiceState } from "@/components/admin/admin-layout";
import { IdentitySecurityCenter } from "@/components/account-security-center";
import { ContactVerificationCenter } from "@/components/contact-verification-center";
import { ApiError, authApi, getSession, refreshSession, updateIdentityOnboarding, type Identity } from "@/lib/auth-api";
import { getAdminSession } from "@/lib/admin-api";
import { isManagementRole, managementBasePath } from "@/lib/role-hierarchy";

export const Route = createFileRoute("/admin/settings/")({ component: AdminSettings });
const inputClass = "w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

export function AdminSettings() {
  const [identity, setIdentity] = useState<Identity | null>(() => getSession()?.identity || null);
  const isIdentityAdmin = isManagementRole(identity?.role);
  useEffect(() => {
    if (isIdentityAdmin && getSession()?.nextStep === "ADD_PAN") window.location.replace(`${managementBasePath(identity?.role)}/account-setup`);
  }, [isIdentityAdmin]);

  const securityComplete = Boolean(identity?.passwordChangedAt && identity?.mpinChangedAt);
  return <AdminLayout active="settings" eyebrow="Account security" title="Settings" description={isIdentityAdmin ? (securityComplete ? "Manage your password, MPIN and account security at any time." : "Complete first-login security here. Other administration sections stay locked until both credentials are changed.") : "Manage secure platform configuration."}>
    {isIdentityAdmin && identity ? <>
      <CredentialSecurity identity={identity} onIdentityChange={setIdentity} />
      <ContactVerificationCenter identity={identity} />
      <IdentitySecurityCenter />
    </> : getAdminSession() ? <ServiceState title="System configuration" description="The current /auth/sessions and /auth/me/permissions endpoints belong to identity accounts. Dedicated Super Admin device-management endpoints are not present in the backend yet." status="Super Admin contract pending" /> : null}
  </AdminLayout>;
}

function CredentialSecurity({ identity, onIdentityChange }: { identity: Identity; onIdentityChange: (identity: Identity) => void }) {
  const [mode, setMode] = useState<"password" | "mpin">(identity.passwordChangedAt ? "mpin" : "password");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const complete = Boolean(identity.passwordChangedAt && identity.mpinChangedAt);

  async function submit(event: FormEvent) {
    event.preventDefault(); setMessage(null);
    if (!current) return setMessage({ ok: false, text: `Enter your temporary ${mode}.` });
    if (next !== confirm) return setMessage({ ok: false, text: `New ${mode} and confirmation do not match.` });
    if (mode === "mpin" && !/^\d{4}$/.test(next)) return setMessage({ ok: false, text: "New MPIN must contain exactly 4 digits." });
    if (mode === "password" && !/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(next)) return setMessage({ ok: false, text: "Password needs 8+ characters with uppercase, lowercase, number and special character." });
    const session = getSession(); if (!session) return window.location.replace("/login");
    const wasSetupComplete = complete;
    setBusy(true);
    try {
      if (mode === "password") {
        await authApi.changePassword(session.accessToken, { currentPassword: current, newPassword: next });
        const synchronized = await refreshSession(); onIdentityChange(synchronized.identity);
        if (!synchronized.identity.mpinChangedAt) {
          updateIdentityOnboarding("CHANGE_MPIN", "CREDENTIAL_CHANGE_REQUIRED");
          setMode("mpin"); setMessage({ ok: true, text: "Password changed. Now change your temporary MPIN to unlock the Admin Console." });
        } else if (wasSetupComplete) setMessage({ ok: true, text: "Password updated successfully. Your MPIN remains active." });
        else window.location.replace(managementBasePath(synchronized.identity.role));
      } else {
        await authApi.changeMpin(session.accessToken, { currentMpin: current, newMpin: next });
        const synchronized = await refreshSession(); onIdentityChange(synchronized.identity);
        if (synchronized.identity.passwordChangedAt && synchronized.identity.mpinChangedAt) {
          updateIdentityOnboarding(null);
          if (wasSetupComplete) setMessage({ ok: true, text: "MPIN updated successfully. Your password remains active." });
          else { setMessage({ ok: true, text: "Security setup complete. Management workspace unlocked." }); window.location.replace(managementBasePath(synchronized.identity.role)); }
        } else setMessage({ ok: false, text: "The refreshed account still shows a pending credential. Please try again." });
      }
      setCurrent(""); setNext(""); setConfirm("");
    } catch (error) { setMessage({ ok: false, text: error instanceof ApiError ? error.message : "Unable to update security credentials." }); }
    finally { setBusy(false); }
  }

  return <div className="grid gap-6 xl:grid-cols-[.7fr_1.3fr]">
    <AdminPanel><p className="text-xs font-extrabold uppercase tracking-wider text-primary">{complete ? "Account protection" : "First-login status"}</p><h2 className="mt-2 text-xl font-black">{complete ? "Security overview" : "Security checklist"}</h2><div className="mt-6 space-y-3"><Status label="Phone & PAN verification" done /><Status label={complete ? "Password protection active" : "Temporary password changed"} done={!!identity.passwordChangedAt} /><Status label={complete ? "MPIN protection active" : "Temporary MPIN changed"} done={!!identity.mpinChangedAt} /></div><p className={`mt-6 rounded-xl p-4 text-xs leading-5 ${complete ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>{complete ? "Your account verification and first-login setup are complete. You can update either credential anytime from this page; all permitted sections remain available." : "Dashboard and other management sections remain locked. Only Settings and Sign out are available during setup."}</p>{complete&&<div className="mt-4 rounded-xl border border-border p-4"><p className="text-sm font-black">Security recommendation</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Use a unique password and private 4-digit MPIN. Never share OTP, password or MPIN with support staff.</p></div>}</AdminPanel>
    <AdminPanel><div className="flex items-start gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">{mode === "password" ? <LockKeyhole size={21} /> : <KeyRound size={21} />}</span><div><p className="text-xs font-extrabold uppercase tracking-wider text-primary">Login & security</p><h2 className="text-xl font-black">{complete ? "Update security credentials" : "Change temporary credentials"}</h2><p className="mt-1 text-xs text-muted-foreground">{complete ? "Choose password or MPIN below. Updating one does not reset the other." : "Replace both credentials once to unlock your workspace."}</p></div></div>
      <div className="mt-6 grid grid-cols-2 gap-3"><StatusCard label="Password" done={!!identity.passwordChangedAt} /><StatusCard label="MPIN" done={!!identity.mpinChangedAt} /></div>
      <div className="mt-5 flex rounded-xl bg-muted p-1">{(["password", "mpin"] as const).map((item) => <button type="button" key={item} disabled={!complete&&!identity.passwordChangedAt&&item==="mpin"} onClick={() => { setMode(item); setMessage(null); setCurrent(""); setNext(""); setConfirm(""); }} className={`flex-1 rounded-lg py-2 text-sm font-bold capitalize disabled:cursor-not-allowed disabled:opacity-40 ${mode === item ? "bg-white text-secondary shadow-sm" : "text-muted-foreground"}`}>{item}</button>)}</div>
      {complete&&<div className="mt-5 flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700"><CheckCircle2 size={20}/>Security setup complete. Credential updates remain available below.</div>}
      <form onSubmit={submit} className="mt-5 space-y-4"><SecureField label={`${complete ? "Current" : "Temporary"} ${mode}`} value={current} setValue={setCurrent} visible={visible} mpin={mode === "mpin"} /><SecureField label={`New ${mode}`} value={next} setValue={setNext} visible={visible} mpin={mode === "mpin"} /><SecureField label={`Confirm new ${mode}`} value={confirm} setValue={setConfirm} visible={visible} mpin={mode === "mpin"} /><button type="button" onClick={() => setVisible(!visible)} className="flex items-center gap-2 text-xs font-bold text-primary">{visible ? <EyeOff size={15} /> : <Eye size={15} />}{visible ? "Hide values" : "Show values"}</button>{message && <p role="alert" className={`rounded-xl p-4 text-sm font-semibold ${message.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{message.text}</p>}<button disabled={busy} className="w-full rounded-xl bg-primary py-3.5 text-sm font-extrabold text-white disabled:opacity-60">{busy ? "Updating..." : `${complete ? "Update" : "Change"} ${mode}`}</button></form>
    </AdminPanel>
  </div>;
}

function Status({ label, done }: { label: string; done: boolean }) { return <div className={`flex items-center gap-3 rounded-xl border p-3 text-sm font-bold ${done ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}><ShieldCheck size={17} />{label}<span className="ml-auto text-[10px] uppercase">{done ? "Complete" : "Required"}</span></div>; }
function StatusCard({ label, done }: { label: string; done: boolean }) { return <div className={`rounded-xl border p-3 text-sm font-bold ${done ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}>{label}: {done ? "Changed" : "Temporary"}</div>; }
function SecureField({ label, value, setValue, visible, mpin }: { label: string; value: string; setValue: (value: string) => void; visible: boolean; mpin: boolean }) { return <label className="block"><span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-muted-foreground">{label}</span><input value={value} onChange={(event) => setValue(mpin ? event.target.value.replace(/\D/g, "").slice(0, 4) : event.target.value)} type={visible ? "text" : "password"} inputMode={mpin ? "numeric" : undefined} autoComplete="new-password" className={inputClass} /></label>; }
