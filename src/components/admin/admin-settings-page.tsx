import { useState, useEffect, type FormEvent } from "react";
import { useLocation } from "@tanstack/react-router";
import { CheckCircle2, Eye, EyeOff, KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import { AdminLayout, AdminPanel } from "@/components/admin/admin-layout";
import { IdentitySecurityCenter } from "@/components/account-security-center";
import { ContactVerificationCenter } from "@/components/contact-verification-center";
import {
  ApiError,
  authApi,
  getSession,
  refreshSession,
  updateIdentityOnboarding,
  type Identity,
} from "@/lib/auth-api";
import { adminAuthApi, AdminApiError, getAdminSession } from "@/lib/admin-api";
import { isManagementRole, managementBasePath } from "@/lib/role-hierarchy";

const inputClass =
  "w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

export function AdminSettingsPage() {
  const [identity, setIdentity] = useState<Identity | null>(() => getSession()?.identity || null);
  const isIdentityAdmin = isManagementRole(identity?.role);
  const requestedSettingsView = useLocation({
    select: (location) => new URL(location.href, "http://localhost").searchParams.get("view"),
  });
  const settingsView =
    requestedSettingsView === "verification" || requestedSettingsView === "access"
      ? requestedSettingsView
      : "security";
  useEffect(() => {
    if (isIdentityAdmin && getSession()?.nextStep === "ADD_PAN")
      window.location.replace(`${managementBasePath(identity?.role)}/account-setup`);
  }, [identity?.role, isIdentityAdmin]);

  const securityComplete = Boolean(identity?.passwordChangedAt && identity?.mpinChangedAt);
  return (
    <AdminLayout
      active="settings"
      eyebrow="Account security"
      title="Settings"
      description={
        isIdentityAdmin
          ? securityComplete
            ? "Manage your password, MPIN and account security at any time."
            : "Complete first-login security here. Other administration sections stay locked until both credentials are changed."
          : "Manage your Super Admin credentials."
      }
    >
      {isIdentityAdmin && identity ? (
        <>
          {settingsView === "security" ? (
            <CredentialSecurity identity={identity} onIdentityChange={setIdentity} />
          ) : null}
          {settingsView === "verification" ? (
            <ContactVerificationCenter identity={identity} />
          ) : null}
          {settingsView === "access" ? <IdentitySecurityCenter /> : null}
        </>
      ) : getAdminSession() ? (
        <SuperAdminSettings />
      ) : null}
    </AdminLayout>
  );
}

// ── Super Admin Settings ──────────────────────────────────────────────────────

function SuperAdminSettings() {
  const session = getAdminSession();
  const name = session?.superAdmin?.fullName || "Super Admin";
  const loginId = session?.superAdmin?.loginId || session?.superAdmin?.email || "";

  return (
    <div className="space-y-6">
      <AdminPanel>
        <p className="text-xs font-extrabold uppercase tracking-wider text-primary">
          Super Admin account
        </p>
        <h2 className="mt-2 text-xl font-black">{name}</h2>
        {loginId ? <p className="mt-1 text-sm text-muted-foreground">{loginId}</p> : null}
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          <ShieldCheck size={16} /> Dedicated Super Admin session active
        </div>
      </AdminPanel>
      <SuperAdminCredentialPanel />
    </div>
  );
}

function SuperAdminCredentialPanel() {
  const [mode, setMode] = useState<"password" | "mpin" | "tpin">("password");
  const [tpinSetup, setTpinSetup] = useState(false); // false = setup flow, true = change flow
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function resetFields() {
    setCurrent("");
    setNext("");
    setConfirm("");
    setMessage(null);
  }

  const isTpin = mode === "tpin";
  const isPin = mode === "mpin" || isTpin;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!current) {
      const label = isTpin ? (tpinSetup ? "current TPIN" : "MPIN") : `current ${mode}`;
      return setMessage({ ok: false, text: `Enter your ${label}.` });
    }
    if (next !== confirm)
      return setMessage({
        ok: false,
        text: `New ${isTpin ? "TPIN" : mode} and confirmation do not match.`,
      });
    if (isTpin && !/^\d{4,6}$/.test(next))
      return setMessage({ ok: false, text: "TPIN must be 4 to 6 digits." });
    if (mode === "mpin" && !/^\d{4}$/.test(next))
      return setMessage({ ok: false, text: "MPIN must be exactly 4 digits." });
    if (mode === "password" && !/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(next))
      return setMessage({
        ok: false,
        text: "Password needs 8+ characters with uppercase, lowercase, number and special character.",
      });

    setBusy(true);
    try {
      if (mode === "password") {
        await adminAuthApi.changeOnboardingPassword(current, next);
        setMessage({ ok: true, text: "Password updated successfully." });
      } else if (mode === "mpin") {
        await adminAuthApi.changeOnboardingMpin(current, next);
        setMessage({ ok: true, text: "MPIN updated successfully." });
      } else {
        if (tpinSetup) {
          await adminAuthApi.changeTpin(current, next);
          setMessage({ ok: true, text: "TPIN changed successfully." });
        } else {
          await adminAuthApi.setupTpin(current, next);
          setMessage({
            ok: true,
            text: "TPIN set up successfully. Use your TPIN for financial operations.",
          });
          setTpinSetup(true);
        }
      }
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setMessage({
        ok: false,
        text:
          err instanceof AdminApiError || err instanceof Error
            ? err.message
            : "Could not update credentials.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminPanel>
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
          {mode === "password" ? <LockKeyhole size={21} /> : <KeyRound size={21} />}
        </span>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-primary">
            Login & security
          </p>
          <h2 className="text-xl font-black">Update credentials</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Change your password, MPIN or TPIN. Updating one does not affect the others.
          </p>
        </div>
      </div>

      <div className="mt-5 flex rounded-xl bg-muted p-1">
        {(["password", "mpin", "tpin"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              setMode(item);
              resetFields();
            }}
            className={`flex-1 rounded-lg py-2 text-sm font-bold uppercase ${mode === item ? "bg-white text-secondary shadow-sm" : "text-muted-foreground"}`}
          >
            {item}
          </button>
        ))}
      </div>

      {isTpin && (
        <div className="mt-4 flex rounded-xl bg-muted p-1">
          {([false, true] as const).map((isChange) => (
            <button
              key={String(isChange)}
              type="button"
              onClick={() => {
                setTpinSetup(isChange);
                resetFields();
              }}
              className={`flex-1 rounded-lg py-2 text-sm font-bold ${
                tpinSetup === isChange
                  ? "bg-white text-secondary shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              {isChange ? "Change TPIN" : "Setup TPIN"}
            </button>
          ))}
        </div>
      )}

      {isTpin && (
        <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
          {tpinSetup
            ? "Enter your current TPIN to change it."
            : "First-time setup: verify with your MPIN, then set a new 4–6 digit TPIN used for financial operations like fund approvals and wallet transfers."}
        </p>
      )}

      <form onSubmit={submit} className="mt-5 space-y-4">
        <SecureField
          label={
            isTpin ? (tpinSetup ? "Current TPIN" : "Current MPIN (to verify)") : `Current ${mode}`
          }
          value={current}
          setValue={setCurrent}
          visible={visible}
          mpin={isPin}
          maxLen={isTpin && !tpinSetup ? 4 : isTpin ? 6 : undefined}
        />
        <SecureField
          label={isTpin ? "New TPIN" : `New ${mode}`}
          value={next}
          setValue={setNext}
          visible={visible}
          mpin={isPin}
          maxLen={isTpin ? 6 : undefined}
        />
        <SecureField
          label={isTpin ? "Confirm new TPIN" : `Confirm new ${mode}`}
          value={confirm}
          setValue={setConfirm}
          visible={visible}
          mpin={isPin}
          maxLen={isTpin ? 6 : undefined}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="flex items-center gap-2 text-xs font-bold text-primary"
        >
          {visible ? <EyeOff size={15} /> : <Eye size={15} />}
          {visible ? "Hide values" : "Show values"}
        </button>
        {message && (
          <p
            role="alert"
            className={`rounded-xl p-4 text-sm font-semibold ${message.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
          >
            {message.text}
          </p>
        )}
        <button
          disabled={busy}
          className="w-full rounded-xl bg-primary py-3.5 text-sm font-extrabold text-white disabled:opacity-60"
        >
          {busy
            ? "Updating…"
            : isTpin
              ? tpinSetup
                ? "Change TPIN"
                : "Setup TPIN"
              : `Update ${mode}`}
        </button>
      </form>
    </AdminPanel>
  );
}

// ── Identity Admin credential panel ──────────────────────────────────────────

function CredentialSecurity({
  identity,
  onIdentityChange,
}: {
  identity: Identity;
  onIdentityChange: (identity: Identity) => void;
}) {
  const [mode, setMode] = useState<"password" | "mpin" | "tpin">(
    identity.passwordChangedAt ? "mpin" : "password",
  );
  const [tpinAction, setTpinAction] = useState<"setup" | "change">("setup");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const complete = Boolean(identity.passwordChangedAt && identity.mpinChangedAt);
  const isTpin = mode === "tpin";
  const isPin = mode === "mpin" || isTpin;

  function resetFields() {
    setCurrent("");
    setNext("");
    setConfirm("");
    setMessage(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    if (!current) {
      const currentLabel = isTpin ? (tpinAction === "setup" ? "MPIN" : "current TPIN") : mode;
      return setMessage({ ok: false, text: `Enter your ${currentLabel}.` });
    }
    if (next !== confirm)
      return setMessage({
        ok: false,
        text: `New ${isTpin ? "TPIN" : mode} and confirmation do not match.`,
      });
    if (isTpin && !/^\d{4,6}$/.test(next))
      return setMessage({ ok: false, text: "TPIN must contain 4 to 6 digits." });
    if (mode === "mpin" && !/^\d{4}$/.test(next))
      return setMessage({ ok: false, text: "New MPIN must contain exactly 4 digits." });
    if (mode === "password" && !/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(next))
      return setMessage({
        ok: false,
        text: "Password needs 8+ characters with uppercase, lowercase, number and special character.",
      });
    const session = getSession();
    if (!session) return window.location.replace("/login");
    const wasSetupComplete = complete;
    setBusy(true);
    try {
      if (mode === "password") {
        await authApi.changePassword(session.accessToken, {
          currentPassword: current,
          newPassword: next,
        });
        const synchronized = await refreshSession();
        onIdentityChange(synchronized.identity);
        if (!synchronized.identity.mpinChangedAt) {
          updateIdentityOnboarding("CHANGE_MPIN", "CREDENTIAL_CHANGE_REQUIRED");
          setMode("mpin");
          setMessage({
            ok: true,
            text: "Password changed. Now change your temporary MPIN to unlock the Admin Console.",
          });
        } else if (wasSetupComplete)
          setMessage({
            ok: true,
            text: "Password updated successfully. Your MPIN remains active.",
          });
        else window.location.replace(managementBasePath(synchronized.identity.role));
      } else if (mode === "mpin") {
        await authApi.changeMpin(session.accessToken, { currentMpin: current, newMpin: next });
        const synchronized = await refreshSession();
        onIdentityChange(synchronized.identity);
        if (synchronized.identity.passwordChangedAt && synchronized.identity.mpinChangedAt) {
          updateIdentityOnboarding(null);
          if (wasSetupComplete)
            setMessage({
              ok: true,
              text: "MPIN updated successfully. Your password remains active.",
            });
          else {
            setMessage({
              ok: true,
              text: "Security setup complete. Management workspace unlocked.",
            });
            window.location.replace(managementBasePath(synchronized.identity.role));
          }
        } else
          setMessage({
            ok: false,
            text: "The refreshed account still shows a pending credential. Please try again.",
          });
      } else if (tpinAction === "setup") {
        const result = await authApi.setupTpin(session.accessToken, {
          currentMpin: current,
          newTpin: next,
        });
        setMessage({ ok: true, text: result.message || "TPIN configured successfully." });
        setTpinAction("change");
      } else {
        const result = await authApi.changeTpin(session.accessToken, {
          currentTpin: current,
          newTpin: next,
        });
        setMessage({ ok: true, text: result.message || "TPIN changed successfully." });
      }
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (error) {
      setMessage({
        ok: false,
        text: error instanceof ApiError ? error.message : "Unable to update security credentials.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[.7fr_1.3fr]">
      <AdminPanel>
        <p className="text-xs font-extrabold uppercase tracking-wider text-primary">
          {complete ? "Account protection" : "First-login status"}
        </p>
        <h2 className="mt-2 text-xl font-black">
          {complete ? "Security overview" : "Security checklist"}
        </h2>
        <div className="mt-6 space-y-3">
          <Status label="Phone & PAN verification" done />
          <Status
            label={complete ? "Password protection active" : "Temporary password changed"}
            done={!!identity.passwordChangedAt}
          />
          <Status
            label={complete ? "MPIN protection active" : "Temporary MPIN changed"}
            done={!!identity.mpinChangedAt}
          />
        </div>
        <p
          className={`mt-6 rounded-xl p-4 text-xs leading-5 ${complete ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}
        >
          {complete
            ? "Your account verification and first-login setup are complete. You can update password, MPIN or TPIN anytime from this page."
            : "Dashboard and other management sections remain locked. Only Settings and Sign out are available during setup."}
        </p>
        {complete && (
          <div className="mt-4 rounded-xl border border-border p-4">
            <p className="text-sm font-black">Security recommendation</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Use a unique password and private PINs. Never share OTP, password, MPIN or TPIN with
              support staff.
            </p>
          </div>
        )}
      </AdminPanel>
      <AdminPanel>
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
            {mode === "password" ? <LockKeyhole size={21} /> : <KeyRound size={21} />}
          </span>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-primary">
              Login & security
            </p>
            <h2 className="text-xl font-black">
              {complete ? "Update security credentials" : "Change temporary credentials"}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {complete
                ? "Choose password, MPIN or TPIN below. Updating one does not reset the others."
                : "Replace both credentials once to unlock your workspace."}
            </p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <StatusCard label="Password" done={!!identity.passwordChangedAt} />
          <StatusCard label="MPIN" done={!!identity.mpinChangedAt} />
        </div>
        <div className="mt-5 flex rounded-xl bg-muted p-1">
          {(["password", "mpin", "tpin"] as const).map((item) => (
            <button
              type="button"
              key={item}
              disabled={
                (!complete && !identity.passwordChangedAt && item === "mpin") ||
                (!complete && item === "tpin")
              }
              onClick={() => {
                setMode(item);
                resetFields();
              }}
              className={`flex-1 rounded-lg py-2 text-sm font-bold uppercase disabled:cursor-not-allowed disabled:opacity-40 ${mode === item ? "bg-white text-secondary shadow-sm" : "text-muted-foreground"}`}
            >
              {item}
            </button>
          ))}
        </div>
        {isTpin ? (
          <>
            <div className="mt-4 flex rounded-xl bg-muted p-1">
              {(["setup", "change"] as const).map((action) => (
                <button
                  type="button"
                  key={action}
                  onClick={() => {
                    setTpinAction(action);
                    resetFields();
                  }}
                  className={`flex-1 rounded-lg py-2 text-sm font-bold ${tpinAction === action ? "bg-white text-secondary shadow-sm" : "text-muted-foreground"}`}
                >
                  {action === "setup" ? "Setup TPIN" : "Change TPIN"}
                </button>
              ))}
            </div>
            <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
              {tpinAction === "setup"
                ? "First-time setup: verify with your MPIN, then create a 4 to 6 digit TPIN."
                : "Enter your existing TPIN, then choose a new 4 to 6 digit TPIN."}
            </p>
          </>
        ) : complete ? (
          <div className="mt-5 flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            <CheckCircle2 size={20} />
            Security setup complete. Credential updates remain available below.
          </div>
        ) : null}
        <form onSubmit={submit} className="mt-5 space-y-4">
          <SecureField
            label={
              isTpin
                ? tpinAction === "setup"
                  ? "Current MPIN (for verification)"
                  : "Current TPIN"
                : `${complete ? "Current" : "Temporary"} ${mode}`
            }
            value={current}
            setValue={setCurrent}
            visible={visible}
            mpin={isPin}
            maxLen={isTpin && tpinAction === "setup" ? 4 : isTpin ? 6 : undefined}
          />
          <SecureField
            label={`New ${isTpin ? "TPIN" : mode}`}
            value={next}
            setValue={setNext}
            visible={visible}
            mpin={isPin}
            maxLen={isTpin ? 6 : undefined}
          />
          <SecureField
            label={`Confirm new ${isTpin ? "TPIN" : mode}`}
            value={confirm}
            setValue={setConfirm}
            visible={visible}
            mpin={isPin}
            maxLen={isTpin ? 6 : undefined}
          />
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            className="flex items-center gap-2 text-xs font-bold text-primary"
          >
            {visible ? <EyeOff size={15} /> : <Eye size={15} />}
            {visible ? "Hide values" : "Show values"}
          </button>
          {message && (
            <p
              role="alert"
              className={`rounded-xl p-4 text-sm font-semibold ${message.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
            >
              {message.text}
            </p>
          )}
          <button
            disabled={busy}
            className="w-full rounded-xl bg-primary py-3.5 text-sm font-extrabold text-white disabled:opacity-60"
          >
            {busy
              ? "Updating..."
              : isTpin
                ? tpinAction === "setup"
                  ? "Setup TPIN"
                  : "Change TPIN"
                : `${complete ? "Update" : "Change"} ${mode}`}
          </button>
        </form>
      </AdminPanel>
    </div>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function Status({ label, done }: { label: string; done: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border p-3 text-sm font-bold ${done ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}
    >
      <ShieldCheck size={17} />
      {label}
      <span className="ml-auto text-[10px] uppercase">{done ? "Complete" : "Required"}</span>
    </div>
  );
}

function StatusCard({ label, done }: { label: string; done: boolean }) {
  return (
    <div
      className={`rounded-xl border p-3 text-sm font-bold ${done ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}
    >
      {label}: {done ? "Changed" : "Temporary"}
    </div>
  );
}

function SecureField({
  label,
  value,
  setValue,
  visible,
  mpin,
  maxLen,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  visible: boolean;
  mpin: boolean;
  maxLen?: number;
}) {
  const limit = maxLen ?? (mpin ? 4 : undefined);
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) =>
          setValue(
            mpin ? event.target.value.replace(/\D/g, "").slice(0, limit ?? 4) : event.target.value,
          )
        }
        type={visible ? "text" : "password"}
        inputMode={mpin ? "numeric" : undefined}
        autoComplete="new-password"
        className={inputClass}
      />
    </label>
  );
}
